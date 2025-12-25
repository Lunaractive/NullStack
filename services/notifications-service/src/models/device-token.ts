import mongoose from 'mongoose';

export interface IDeviceToken extends mongoose.Document {
  playerId: string;
  titleId: string;
  token: string;
  platform: 'ios' | 'android';
  appVersion?: string;
  deviceModel?: string;
  osVersion?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    index: true
  },
  titleId: {
    type: String,
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android'],
    required: true
  },
  appVersion: String,
  deviceModel: String,
  osVersion: String,
  enabled: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
});

deviceTokenSchema.index({ titleId: 1, playerId: 1 });
deviceTokenSchema.index({ titleId: 1, enabled: 1 });

export const DeviceToken = mongoose.model<IDeviceToken>('DeviceToken', deviceTokenSchema);
