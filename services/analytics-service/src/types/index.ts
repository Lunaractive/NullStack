export interface AnalyticsEvent {
  eventId?: string;
  titleId: string;
  playerId?: string;
  sessionId?: string;
  eventName: string;
  eventData: Record<string, any>;
  timestamp: Date;
  platform?: string;
  version?: string;
  country?: string;
  deviceType?: string;
}

export interface BatchEventRequest {
  events: AnalyticsEvent[];
}

export interface EventQueryParams {
  titleId: string;
  eventName?: string;
  playerId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface DAUReport {
  date: string;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  sessions: number;
  avgSessionDuration: number;
}

export interface RetentionReport {
  cohortDate: string;
  cohortSize: number;
  day1: number;
  day3: number;
  day7: number;
  day14: number;
  day30: number;
}

export interface EventAnalytics {
  eventName: string;
  totalCount: number;
  uniqueUsers: number;
  avgPerUser: number;
  topValues: Array<{
    value: string;
    count: number;
  }>;
  timeline: Array<{
    date: string;
    count: number;
  }>;
}

export interface FunnelStep {
  stepName: string;
  eventName: string;
  requiredProperties?: Record<string, any>;
}

export interface FunnelAnalysis {
  totalUsers: number;
  steps: Array<{
    stepName: string;
    users: number;
    dropoff: number;
    conversionRate: number;
  }>;
}

export interface AggregationJob {
  titleId: string;
  date: string;
  type: 'dau' | 'retention' | 'events';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
