import mongoose from 'mongoose';

export interface INotification extends mongoose.Document {
  titleId: string;
  notificationId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  imageUrl?: string;
  targetType: 'broadcast' | 'segment' | 'players';
  targetSegmentId?: string;
  targetPlayerIds?: string[];
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  errorMessage?: string;
}

const notificationSchema = new mongoose.Schema({
  titleId: {
    type: String,
    required: true,
    index: true
  },
  notificationId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  imageUrl: String,
  targetType: {
    type: String,
    enum: ['broadcast', 'segment', 'players'],
    required: true
  },
  targetSegmentId: String,
  targetPlayerIds: [String],
  scheduledFor: Date,
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
    default: 'draft',
    index: true
  },
  sentCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  deliveredCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  sentAt: Date,
  errorMessage: String,
});

notificationSchema.index({ titleId: 1, status: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ titleId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
