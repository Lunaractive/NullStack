import { webhookDispatcher } from './webhook-dispatcher';
import logger from './utils/logger';
import database from './database';

/**
 * Event handler for processing system events and triggering automations
 */
export class EventHandler {
  /**
   * Handle incoming events from RabbitMQ
   */
  async handleEvent(event: any): Promise<void> {
    try {
      const { eventType, projectId, payload, timestamp } = event;

      logger.info('Processing event', { eventType, projectId });

      // Dispatch to webhooks
      await this.dispatchWebhooks(eventType, projectId, payload);

      // Process automation rules
      await this.processAutomationRules(eventType, projectId, payload);

      logger.debug('Event processed successfully', { eventType, projectId });
    } catch (error: any) {
      logger.error('Error handling event', { error: error.message });
      throw error;
    }
  }

  /**
   * Dispatch event to all subscribed webhooks
   */
  private async dispatchWebhooks(
    eventType: string,
    projectId: string,
    payload: any
  ): Promise<void> {
    try {
      await webhookDispatcher.dispatchToSubscribers(eventType, projectId, payload);
    } catch (error: any) {
      logger.error('Error dispatching webhooks', {
        eventType,
        projectId,
        error: error.message,
      });
    }
  }

  /**
   * Process automation rules triggered by this event
   */
  private async processAutomationRules(
    eventType: string,
    projectId: string,
    payload: any
  ): Promise<void> {
    try {
      // Find active automation rules for this event type
      const result = await database.query(
        `SELECT id, name, trigger_config, action_type, action_config, conditions
         FROM automation_rules
         WHERE project_id = $1
           AND is_active = true
           AND trigger_type = $2`,
        [projectId, eventType]
      );

      if (result.rows.length === 0) {
        return;
      }

      logger.info('Found automation rules', {
        eventType,
        projectId,
        count: result.rows.length,
      });

      // Process each rule
      for (const rule of result.rows) {
        await this.executeAutomationRule(rule, payload);
      }
    } catch (error: any) {
      logger.error('Error processing automation rules', {
        eventType,
        projectId,
        error: error.message,
      });
    }
  }

  /**
   * Execute an automation rule
   */
  private async executeAutomationRule(rule: any, eventPayload: any): Promise<void> {
    try {
      // Check if conditions are met
      if (!this.evaluateConditions(rule.conditions, eventPayload)) {
        logger.debug('Rule conditions not met', { ruleId: rule.id });
        return;
      }

      logger.info('Executing automation rule', {
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: rule.action_type,
      });

      // Execute the action based on action type
      switch (rule.action_type) {
        case 'webhook':
          await this.executeWebhookAction(rule.action_config);
          break;
        case 'function':
          await this.executeFunctionAction(rule.action_config, eventPayload);
          break;
        case 'notification':
          await this.executeNotificationAction(rule.action_config, eventPayload);
          break;
        default:
          logger.warn('Unknown action type', {
            ruleId: rule.id,
            actionType: rule.action_type,
          });
      }

      // Update execution count and last executed time
      await database.query(
        `UPDATE automation_rules
         SET execution_count = execution_count + 1,
             last_executed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [rule.id]
      );

      logger.info('Automation rule executed successfully', {
        ruleId: rule.id,
        ruleName: rule.name,
      });
    } catch (error: any) {
      logger.error('Error executing automation rule', {
        ruleId: rule.id,
        error: error.message,
      });
    }
  }

  /**
   * Evaluate conditions against event payload
   */
  private evaluateConditions(conditions: any[], payload: any): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means always execute
    }

    // Simple condition evaluation
    // In production, you'd want a more robust condition engine
    for (const condition of conditions) {
      const { field, operator, value } = condition;
      const fieldValue = this.getNestedValue(payload, field);

      switch (operator) {
        case 'equals':
          if (fieldValue !== value) return false;
          break;
        case 'not_equals':
          if (fieldValue === value) return false;
          break;
        case 'contains':
          if (!String(fieldValue).includes(value)) return false;
          break;
        case 'greater_than':
          if (!(fieldValue > value)) return false;
          break;
        case 'less_than':
          if (!(fieldValue < value)) return false;
          break;
        default:
          logger.warn('Unknown condition operator', { operator });
          return false;
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Execute webhook action
   */
  private async executeWebhookAction(config: any): Promise<void> {
    // Implementation would call webhook dispatcher
    logger.debug('Executing webhook action', { config });
  }

  /**
   * Execute function action
   */
  private async executeFunctionAction(config: any, payload: any): Promise<void> {
    // Implementation would call the CloudScript runtime
    logger.debug('Executing function action', { config });
  }

  /**
   * Execute notification action
   */
  private async executeNotificationAction(
    config: any,
    payload: any
  ): Promise<void> {
    // Implementation would send notification via notification service
    logger.debug('Executing notification action', { config });
  }
}

export const eventHandler = new EventHandler();
export default eventHandler;
