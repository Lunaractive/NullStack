import mongoose from 'mongoose';

const playerDataSchema = new mongoose.Schema({
  playerId: { type: String, required: true, index: true },
  titleId: { type: String, required: true, index: true },
  dataType: {
    type: String,
    required: true,
    enum: ['CustomData', 'ReadOnlyData', 'InternalData'],
    index: true
  },
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  permission: {
    type: String,
    enum: ['Public', 'Private'],
    default: 'Private',
  },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

playerDataSchema.index({ titleId: 1, playerId: 1, dataType: 1, key: 1 }, { unique: true });

export const PlayerData = mongoose.model('PlayerData', playerDataSchema);

export interface IPlayerData {
  playerId: string;
  titleId: string;
  dataType: 'CustomData' | 'ReadOnlyData' | 'InternalData';
  key: string;
  value: any;
  permission?: 'Public' | 'Private';
  lastUpdated?: Date;
  createdAt?: Date;
}

export async function getPlayerData(
  playerId: string,
  titleId: string,
  dataType: string,
  key?: string
): Promise<Record<string, any>> {
  const query: any = { playerId, titleId, dataType };

  if (key) {
    query.key = key;
  }

  const data = await PlayerData.find(query);

  const result: Record<string, any> = {};
  data.forEach((item) => {
    result[item.key] = {
      value: item.value,
      lastUpdated: item.lastUpdated,
    };
  });

  return result;
}

export async function setPlayerData(
  playerId: string,
  titleId: string,
  dataType: string,
  key: string,
  value: any,
  permission?: 'Public' | 'Private'
): Promise<void> {
  await PlayerData.findOneAndUpdate(
    { playerId, titleId, dataType, key },
    {
      value,
      permission: permission || 'Private',
      lastUpdated: new Date(),
    },
    { upsert: true, new: true }
  );
}

export async function deletePlayerData(
  playerId: string,
  titleId: string,
  dataType: string,
  key: string
): Promise<boolean> {
  const result = await PlayerData.deleteOne({ playerId, titleId, dataType, key });
  return result.deletedCount > 0;
}
