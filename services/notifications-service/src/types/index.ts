export interface NotificationTarget {
  type: 'broadcast' | 'segment' | 'players';
  segmentId?: string;
  playerIds?: string[];
}

export interface NotificationPayload {
  title: string;
  message: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export interface NotificationStats {
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
}

export interface DeviceInfo {
  token: string;
  platform: 'ios' | 'android';
  appVersion?: string;
  deviceModel?: string;
  osVersion?: string;
}

export type NotificationStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export interface SendResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  stats?: NotificationStats;
}
