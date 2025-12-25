import mongoose, { Schema, Document } from 'mongoose';
import { AnalyticsEvent } from '../types';

export interface IEvent extends Omit<AnalyticsEvent, 'eventId'>, Document {
  eventId: string;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    titleId: {
      type: String,
      required: true,
      index: true,
    },
    playerId: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      index: true,
    },
    eventData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    platform: String,
    version: String,
    country: String,
    deviceType: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for common queries
EventSchema.index({ titleId: 1, eventName: 1, timestamp: -1 });
EventSchema.index({ titleId: 1, playerId: 1, timestamp: -1 });
EventSchema.index({ titleId: 1, timestamp: -1 });

// TTL index - events expire after 90 days
EventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
