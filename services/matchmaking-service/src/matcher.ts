import { redis } from '@nullstack/database';
import { postgres } from '@nullstack/database';
import { Match, MatchmakingTicket } from '@nullstack/database';
import { v4 as uuidv4 } from 'uuid';

interface TicketData {
  ticketId: string;
  playerId: string;
  attributes: Record<string, string | number | boolean>;
  createdAt: number;
  giveUpAfter: number | null;
}

interface QueueConfig {
  queueName: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
  teamConfiguration?: {
    teams?: Array<{
      teamId: string;
      minPlayers: number;
      maxPlayers: number;
    }>;
  };
  matchingRules?: {
    skillMatchingEnabled?: boolean;
    skillRange?: number;
    latencyMatchingEnabled?: boolean;
    maxLatencyMs?: number;
    customAttributeMatching?: Array<{
      attributeName: string;
      matchType: 'exact' | 'range' | 'difference';
      maxDifference?: number;
    }>;
  };
  serverAllocationStrategy?: 'closest' | 'balanced' | 'custom';
  timeoutSeconds?: number;
  enabled: boolean;
}

export class MatchmakingMatcher {
  private isRunning: boolean = false;
  private pollIntervalMs: number = 1000;

  async start() {
    if (this.isRunning) {
      console.log('Matcher is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting matchmaking matcher...');
    this.runMatchingLoop();
  }

  async stop() {
    this.isRunning = false;
    console.log('Stopping matchmaking matcher...');
  }

  private async runMatchingLoop() {
    while (this.isRunning) {
      try {
        await this.processQueues();
      } catch (error) {
        console.error('Error in matching loop:', error);
      }

      await this.sleep(this.pollIntervalMs);
    }
  }

  private async processQueues() {
    // Get all active queues from PostgreSQL
    const result = await postgres.query(
      'SELECT title_id, queue_name, config FROM matchmaking_queues'
    );

    for (const row of result.rows) {
      const titleId = row.title_id;
      const queueName = row.queue_name;
      const queueConfig: QueueConfig = JSON.parse(row.config);

      if (!queueConfig.enabled) {
        continue;
      }

      try {
        await this.processQueue(titleId, queueName, queueConfig);
      } catch (error) {
        console.error(`Error processing queue ${queueName}:`, error);
      }
    }
  }

  private async processQueue(
    titleId: string,
    queueName: string,
    queueConfig: QueueConfig
  ) {
    const queueKey = `waiting:${titleId}:${queueName}`;

    // Get all waiting tickets sorted by creation time
    const ticketStrings = await redis.zrange(queueKey, 0, -1);

    if (ticketStrings.length === 0) {
      return;
    }

    const tickets: TicketData[] = [];
    const now = Date.now();

    // Parse tickets and remove expired ones
    for (const ticketStr of ticketStrings) {
      const ticket = JSON.parse(ticketStr);

      // Check if ticket has expired
      if (ticket.giveUpAfter && ticket.giveUpAfter < now) {
        await this.expireTicket(titleId, queueName, ticket);
        continue;
      }

      tickets.push(ticket);
    }

    // Try to create matches
    if (tickets.length >= queueConfig.minPlayers) {
      await this.attemptMatching(titleId, queueName, queueConfig, tickets);
    }
  }

  private async attemptMatching(
    titleId: string,
    queueName: string,
    queueConfig: QueueConfig,
    tickets: TicketData[]
  ) {
    const matchingRules = queueConfig.matchingRules || {};

    // Group tickets based on matching rules
    let eligibleGroups: TicketData[][] = [];

    if (matchingRules.skillMatchingEnabled && matchingRules.skillRange) {
      // Group by skill rating
      eligibleGroups = this.groupBySkill(tickets, matchingRules.skillRange);
    } else if (matchingRules.customAttributeMatching) {
      // Group by custom attributes
      eligibleGroups = this.groupByCustomAttributes(
        tickets,
        matchingRules.customAttributeMatching
      );
    } else {
      // Simple FIFO matching
      eligibleGroups = [tickets];
    }

    // Try to create matches from eligible groups
    for (const group of eligibleGroups) {
      if (group.length >= queueConfig.minPlayers) {
        const matchTickets = group.slice(0, queueConfig.maxPlayers);
        await this.createMatch(titleId, queueName, queueConfig, matchTickets);
      }
    }
  }

  private groupBySkill(
    tickets: TicketData[],
    skillRange: number
  ): TicketData[][] {
    const groups: TicketData[][] = [];
    const sorted = [...tickets].sort(
      (a, b) =>
        (a.attributes.skillRating as number) -
        (b.attributes.skillRating as number)
    );

    let currentGroup: TicketData[] = [];
    let groupBaseSkill: number | null = null;

    for (const ticket of sorted) {
      const skill = ticket.attributes.skillRating as number;

      if (!skill) {
        continue;
      }

      if (
        groupBaseSkill === null ||
        Math.abs(skill - groupBaseSkill) <= skillRange
      ) {
        if (groupBaseSkill === null) {
          groupBaseSkill = skill;
        }
        currentGroup.push(ticket);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [ticket];
        groupBaseSkill = skill;
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private groupByCustomAttributes(
    tickets: TicketData[],
    attributeRules: Array<{
      attributeName: string;
      matchType: 'exact' | 'range' | 'difference';
      maxDifference?: number;
    }>
  ): TicketData[][] {
    const groups = new Map<string, TicketData[]>();

    for (const ticket of tickets) {
      let groupKey = '';

      for (const rule of attributeRules) {
        const value = ticket.attributes[rule.attributeName];

        if (rule.matchType === 'exact') {
          groupKey += `${rule.attributeName}:${value}|`;
        } else {
          // For range and difference, we'll use a simplified grouping
          // In production, you'd want more sophisticated clustering
          groupKey += `${rule.attributeName}:any|`;
        }
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }

      groups.get(groupKey)!.push(ticket);
    }

    return Array.from(groups.values());
  }

  private async createMatch(
    titleId: string,
    queueName: string,
    queueConfig: QueueConfig,
    tickets: TicketData[]
  ) {
    const matchId = uuidv4();

    console.log(
      `Creating match ${matchId} for queue ${queueName} with ${tickets.length} players`
    );

    // Assign teams if team configuration exists
    const players = this.assignTeams(tickets, queueConfig);

    // Allocate server based on strategy
    const serverInfo = await this.allocateServer(
      titleId,
      queueConfig.serverAllocationStrategy || 'closest',
      tickets
    );

    // Create match in MongoDB
    const match = await Match.create({
      _id: matchId,
      titleId,
      queueName,
      players,
      serverInfo,
      createdAt: new Date(),
    });

    // Update tickets to matched status
    for (const ticket of tickets) {
      await MatchmakingTicket.findByIdAndUpdate(ticket.ticketId, {
        status: 'matched',
        matchId,
      });

      // Remove from waiting queue
      const queueKey = `waiting:${titleId}:${queueName}`;
      const allTickets = await redis.zrange(queueKey, 0, -1);

      for (const ticketStr of allTickets) {
        const ticketData = JSON.parse(ticketStr);
        if (ticketData.ticketId === ticket.ticketId) {
          await redis.zrem(queueKey, ticketStr);
          break;
        }
      }

      // Update ticket in Redis
      await redis.set(
        `ticket:${ticket.ticketId}`,
        JSON.stringify({ ...ticket, status: 'matched', matchId }),
        300
      );
    }

    // Publish match created event
    await this.publishMatchCreatedEvent(titleId, matchId, players);

    console.log(`Match ${matchId} created successfully`);
  }

  private assignTeams(
    tickets: TicketData[],
    queueConfig: QueueConfig
  ): Array<{
    playerId: string;
    teamId: string;
    attributes: Record<string, string | number | boolean>;
  }> {
    const players = tickets.map((ticket, index) => ({
      playerId: ticket.playerId,
      teamId: queueConfig.teamConfiguration?.teams
        ? this.determineTeam(index, queueConfig.teamConfiguration.teams)
        : 'team0',
      attributes: ticket.attributes,
    }));

    return players;
  }

  private determineTeam(
    playerIndex: number,
    teams: Array<{ teamId: string; minPlayers: number; maxPlayers: number }>
  ): string {
    // Simple round-robin team assignment
    // In production, you'd want skill-balanced team assignment
    const teamIndex = playerIndex % teams.length;
    return teams[teamIndex].teamId;
  }

  private async allocateServer(
    titleId: string,
    strategy: 'closest' | 'balanced' | 'custom',
    tickets: TicketData[]
  ): Promise<{ host: string; port: number; region: string }> {
    // This is a simplified server allocation
    // In production, you'd integrate with a server fleet management system

    const regions = ['us-east', 'us-west', 'eu-west', 'ap-southeast'];
    let selectedRegion = regions[0];

    if (strategy === 'closest' && tickets[0].attributes.region) {
      selectedRegion = tickets[0].attributes.region as string;
    } else if (strategy === 'balanced') {
      // Select least loaded region
      selectedRegion = regions[Math.floor(Math.random() * regions.length)];
    }

    // Generate mock server info
    // In production, this would request a server from your fleet manager
    return {
      host: `${selectedRegion}-server-${Math.floor(Math.random() * 100)}.example.com`,
      port: 7777 + Math.floor(Math.random() * 1000),
      region: selectedRegion,
    };
  }

  private async publishMatchCreatedEvent(
    titleId: string,
    matchId: string,
    players: Array<{ playerId: string; teamId: string }>
  ) {
    const event = {
      type: 'match.created',
      titleId,
      matchId,
      players,
      timestamp: new Date().toISOString(),
    };

    // Publish to Redis pub/sub for real-time notifications
    await redis.publish(
      `matchmaking:${titleId}`,
      JSON.stringify(event)
    );

    // Notify each player
    for (const player of players) {
      await redis.publish(
        `player:${player.playerId}:notifications`,
        JSON.stringify({
          type: 'match_found',
          matchId,
          teamId: player.teamId,
        })
      );
    }
  }

  private async expireTicket(
    titleId: string,
    queueName: string,
    ticket: TicketData
  ) {
    console.log(`Expiring ticket ${ticket.ticketId}`);

    // Update ticket status to expired
    await MatchmakingTicket.findByIdAndUpdate(ticket.ticketId, {
      status: 'expired',
    });

    // Remove from waiting queue
    const queueKey = `waiting:${titleId}:${queueName}`;
    const allTickets = await redis.zrange(queueKey, 0, -1);

    for (const ticketStr of allTickets) {
      const ticketData = JSON.parse(ticketStr);
      if (ticketData.ticketId === ticket.ticketId) {
        await redis.zrem(queueKey, ticketStr);
        break;
      }
    }

    // Notify player that ticket expired
    await redis.publish(
      `player:${ticket.playerId}:notifications`,
      JSON.stringify({
        type: 'ticket_expired',
        ticketId: ticket.ticketId,
      })
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const matcher = new MatchmakingMatcher();
