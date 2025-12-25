import mongoose from 'mongoose';

const playerProfileSchema = new mongoose.Schema({
  playerId: { type: String, required: true, index: true },
  titleId: { type: String, required: true, index: true },
  displayName: { type: String, required: true },
  avatarUrl: String,
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  tags: [String],
  customData: { type: Map, of: mongoose.Schema.Types.Mixed },
  statistics: { type: Map, of: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

playerProfileSchema.index({ titleId: 1, playerId: 1 }, { unique: true });

const inventoryItemSchema = new mongoose.Schema({
  itemInstanceId: { type: String, required: true },
  itemId: { type: String, required: true },
  catalogVersion: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
  expiration: Date,
  remainingUses: Number,
  customData: { type: Map, of: mongoose.Schema.Types.Mixed },
});

const playerInventorySchema = new mongoose.Schema({
  playerId: { type: String, required: true, index: true },
  titleId: { type: String, required: true, index: true },
  items: [inventoryItemSchema],
  updatedAt: { type: Date, default: Date.now },
});

playerInventorySchema.index({ titleId: 1, playerId: 1 }, { unique: true });

const cloudScriptFunctionSchema = new mongoose.Schema({
  titleId: { type: String, required: true, index: true },
  functionName: { type: String, required: true },
  code: { type: String, required: true },
  runtime: { type: String, enum: ['nodejs18', 'nodejs20'], default: 'nodejs20' },
  timeoutSeconds: { type: Number, default: 10, max: 30 },
  memoryMB: { type: Number, default: 128, max: 512 },
  version: { type: Number, default: 1 },
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

cloudScriptFunctionSchema.index({ titleId: 1, functionName: 1 }, { unique: true });

const cloudScriptExecutionSchema = new mongoose.Schema({
  titleId: { type: String, required: true, index: true },
  functionName: { type: String, required: true },
  playerId: String,
  args: { type: Map, of: mongoose.Schema.Types.Mixed },
  result: mongoose.Schema.Types.Mixed,
  error: String,
  executionTimeMs: Number,
  createdAt: { type: Date, default: Date.now, expires: 2592000 },
});

cloudScriptExecutionSchema.index({ titleId: 1, createdAt: -1 });
cloudScriptExecutionSchema.index({ playerId: 1, createdAt: -1 });

const eventDataSchema = new mongoose.Schema({
  titleId: { type: String, required: true, index: true },
  playerId: { type: String, index: true },
  eventName: { type: String, required: true, index: true },
  eventNamespace: { type: String, required: true },
  properties: { type: Map, of: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true },
  sessionId: String,
  source: { type: String, required: true },
});

eventDataSchema.index({ titleId: 1, eventName: 1, timestamp: -1 });
eventDataSchema.index({ titleId: 1, playerId: 1, timestamp: -1 });
eventDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const matchmakingTicketSchema = new mongoose.Schema({
  titleId: { type: String, required: true, index: true },
  playerId: { type: String, required: true, index: true },
  queueName: { type: String, required: true, index: true },
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['waiting', 'matched', 'cancelled', 'expired'],
    default: 'waiting',
  },
  matchId: String,
});

matchmakingTicketSchema.index({ titleId: 1, queueName: 1, status: 1 });
matchmakingTicketSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

const matchSchema = new mongoose.Schema({
  titleId: { type: String, required: true, index: true },
  queueName: { type: String, required: true },
  players: [{
    playerId: String,
    teamId: String,
    attributes: { type: Map, of: mongoose.Schema.Types.Mixed },
  }],
  createdAt: { type: Date, default: Date.now },
  serverInfo: {
    host: String,
    port: Number,
    region: String,
  },
});

matchSchema.index({ titleId: 1, createdAt: -1 });

const pushNotificationSchema = new mongoose.Schema({
  titleId: { type: String, required: true, index: true },
  targetSegmentId: String,
  targetPlayerIds: [String],
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Map, of: mongoose.Schema.Types.Mixed },
  scheduledFor: Date,
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
    default: 'draft',
  },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

pushNotificationSchema.index({ titleId: 1, status: 1 });
pushNotificationSchema.index({ scheduledFor: 1 });

const currencyBalanceSchema = new mongoose.Schema({
  currencyCode: { type: String, required: true },
  amount: { type: Number, required: true, default: 0 },
});

const playerCurrencySchema = new mongoose.Schema({
  playerId: { type: String, required: true, index: true },
  titleId: { type: String, required: true, index: true },
  balances: [currencyBalanceSchema],
  updatedAt: { type: Date, default: Date.now },
});

playerCurrencySchema.index({ titleId: 1, playerId: 1 }, { unique: true });

export const PlayerProfile = mongoose.model('PlayerProfile', playerProfileSchema);
export const PlayerInventory = mongoose.model('PlayerInventory', playerInventorySchema);
export const PlayerCurrency = mongoose.model('PlayerCurrency', playerCurrencySchema);
export const CloudScriptFunction = mongoose.model('CloudScriptFunction', cloudScriptFunctionSchema);
export const CloudScriptExecution = mongoose.model('CloudScriptExecution', cloudScriptExecutionSchema);
export const EventData = mongoose.model('EventData', eventDataSchema);
export const MatchmakingTicket = mongoose.model('MatchmakingTicket', matchmakingTicketSchema);
export const Match = mongoose.model('Match', matchSchema);
export const PushNotification = mongoose.model('PushNotification', pushNotificationSchema);

export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nullstack';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

export async function mongoHealthCheck(): Promise<boolean> {
  try {
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}
