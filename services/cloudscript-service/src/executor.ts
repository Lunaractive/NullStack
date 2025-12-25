import ivm from 'isolated-vm';
import { CloudScriptExecution } from '@nullstack/database';
import { PlayerProfile, PlayerInventory } from '@nullstack/database';

export interface ExecutionContext {
  titleId: string;
  playerId?: string;
  functionName: string;
  args: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs: number;
  logs: string[];
}

export interface CloudScriptAPI {
  getPlayerData: (playerId: string) => Promise<any>;
  setPlayerData: (playerId: string, data: any) => Promise<void>;
  getPlayerInventory: (playerId: string) => Promise<any>;
  grantItem: (playerId: string, itemId: string, catalogVersion?: string) => Promise<any>;
  addVirtualCurrency: (playerId: string, currency: string, amount: number) => Promise<void>;
  subtractVirtualCurrency: (playerId: string, currency: string, amount: number) => Promise<void>;
  updatePlayerStatistics: (playerId: string, statistics: Record<string, number>) => Promise<void>;
  log: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

class CloudScriptExecutor {
  private logs: string[] = [];

  async execute(
    code: string,
    context: ExecutionContext,
    timeoutMs: number = 30000,
    memoryMB: number = 512
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.logs = [];

    try {
      // Create isolated VM with memory limit
      const isolate = new ivm.Isolate({ memoryLimit: memoryMB });
      const vmContext = await isolate.createContext();

      // Create logging functions
      const logInfo = new ivm.Reference((message: string) => {
        this.logs.push(`[INFO] ${message}`);
      });
      const logWarn = new ivm.Reference((message: string) => {
        this.logs.push(`[WARN] ${message}`);
      });
      const logError = new ivm.Reference((message: string) => {
        this.logs.push(`[ERROR] ${message}`);
      });

      await vmContext.global.set('_logInfo', logInfo.derefInto());
      await vmContext.global.set('_logWarn', logWarn.derefInto());
      await vmContext.global.set('_logError', logError.derefInto());

      // Create API object with player data methods
      const api = this.createAPI(context);

      // Create references for API methods
      const getPlayerDataRef = new ivm.Reference(async (playerId: string) => {
        return await api.getPlayerData(playerId);
      });

      const setPlayerDataRef = new ivm.Reference(async (playerId: string, data: any) => {
        return await api.setPlayerData(playerId, data);
      });

      const getPlayerInventoryRef = new ivm.Reference(async (playerId: string) => {
        return await api.getPlayerInventory(playerId);
      });

      const grantItemRef = new ivm.Reference(async (playerId: string, itemId: string, catalogVersion?: string) => {
        return await api.grantItem(playerId, itemId, catalogVersion);
      });

      const addVirtualCurrencyRef = new ivm.Reference(async (playerId: string, currency: string, amount: number) => {
        return await api.addVirtualCurrency(playerId, currency, amount);
      });

      const subtractVirtualCurrencyRef = new ivm.Reference(async (playerId: string, currency: string, amount: number) => {
        return await api.subtractVirtualCurrency(playerId, currency, amount);
      });

      const updatePlayerStatisticsRef = new ivm.Reference(async (playerId: string, statistics: Record<string, number>) => {
        return await api.updatePlayerStatistics(playerId, statistics);
      });

      // Set up API references in context
      await vmContext.global.set('_getPlayerData', getPlayerDataRef.derefInto());
      await vmContext.global.set('_setPlayerData', setPlayerDataRef.derefInto());
      await vmContext.global.set('_getPlayerInventory', getPlayerInventoryRef.derefInto());
      await vmContext.global.set('_grantItem', grantItemRef.derefInto());
      await vmContext.global.set('_addVirtualCurrency', addVirtualCurrencyRef.derefInto());
      await vmContext.global.set('_subtractVirtualCurrency', subtractVirtualCurrencyRef.derefInto());
      await vmContext.global.set('_updatePlayerStatistics', updatePlayerStatisticsRef.derefInto());

      // Set up the context with current player ID
      await vmContext.global.set('_currentPlayerId', new ivm.ExternalCopy(context.playerId).copyInto());
      await vmContext.global.set('_args', new ivm.ExternalCopy(context.args).copyInto());

      // Create the API wrapper and handler function in the VM
      const setupScript = `
        const server = {
          log: {
            info: (msg) => _logInfo.applySync(undefined, [msg]),
            warn: (msg) => _logWarn.applySync(undefined, [msg]),
            error: (msg) => _logError.applySync(undefined, [msg])
          },
          getPlayerData: async (playerId) => {
            return await _getPlayerData.apply(undefined, [playerId || _currentPlayerId]);
          },
          setPlayerData: async (playerId, data) => {
            if (typeof playerId === 'object') {
              data = playerId;
              playerId = _currentPlayerId;
            }
            return await _setPlayerData.apply(undefined, [playerId, data]);
          },
          getPlayerInventory: async (playerId) => {
            return await _getPlayerInventory.apply(undefined, [playerId || _currentPlayerId]);
          },
          grantItem: async (playerId, itemId, catalogVersion) => {
            if (typeof playerId === 'string' && !itemId) {
              itemId = playerId;
              playerId = _currentPlayerId;
            }
            return await _grantItem.apply(undefined, [playerId, itemId, catalogVersion]);
          },
          addVirtualCurrency: async (playerId, currency, amount) => {
            if (typeof playerId === 'string' && typeof currency === 'number') {
              amount = currency;
              currency = playerId;
              playerId = _currentPlayerId;
            }
            return await _addVirtualCurrency.apply(undefined, [playerId, currency, amount]);
          },
          subtractVirtualCurrency: async (playerId, currency, amount) => {
            if (typeof playerId === 'string' && typeof currency === 'number') {
              amount = currency;
              currency = playerId;
              playerId = _currentPlayerId;
            }
            return await _subtractVirtualCurrency.apply(undefined, [playerId, currency, amount]);
          },
          updatePlayerStatistics: async (playerId, statistics) => {
            if (typeof playerId === 'object') {
              statistics = playerId;
              playerId = _currentPlayerId;
            }
            return await _updatePlayerStatistics.apply(undefined, [playerId, statistics]);
          }
        };

        const currentPlayerId = _currentPlayerId;
        const args = _args;
      `;

      await vmContext.eval(setupScript);

      // Execute the user's CloudScript function
      const userScript = `
        ${code}

        // Call the handler function
        (async () => {
          try {
            const result = await handlers.${context.functionName}(args, { server, currentPlayerId });
            return result;
          } catch (err) {
            throw new Error(err.message || String(err));
          }
        })();
      `;

      const script = await isolate.compileScript(userScript);
      const result = await script.run(vmContext, { timeout: timeoutMs, promise: true });

      // Copy result out of VM
      const executionResult = await result.copy();

      // Log execution to database
      await this.logExecution(context, executionResult, null, Date.now() - startTime);

      return {
        success: true,
        result: executionResult,
        executionTimeMs: Date.now() - startTime,
        logs: this.logs,
      };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;

      // Log error execution to database
      await this.logExecution(context, null, error.message, executionTimeMs);

      return {
        success: false,
        error: error.message || 'Unknown execution error',
        executionTimeMs,
        logs: this.logs,
      };
    }
  }

  private createAPI(context: ExecutionContext): CloudScriptAPI {
    return {
      getPlayerData: async (playerId: string) => {
        const profile = await PlayerProfile.findOne({
          titleId: context.titleId,
          playerId: playerId || context.playerId,
        });

        if (!profile) {
          return null;
        }

        return {
          playerId: profile.playerId,
          displayName: profile.displayName,
          level: profile.level,
          experience: profile.experience,
          customData: profile.customData ? Object.fromEntries(profile.customData) : {},
          statistics: profile.statistics ? Object.fromEntries(profile.statistics) : {},
        };
      },

      setPlayerData: async (playerId: string, data: any) => {
        await PlayerProfile.findOneAndUpdate(
          {
            titleId: context.titleId,
            playerId: playerId || context.playerId,
          },
          {
            $set: {
              customData: data,
              updatedAt: new Date(),
            },
          },
          { upsert: false }
        );
      },

      getPlayerInventory: async (playerId: string) => {
        const inventory = await PlayerInventory.findOne({
          titleId: context.titleId,
          playerId: playerId || context.playerId,
        });

        if (!inventory) {
          return { items: [] };
        }

        return {
          items: inventory.items.map((item: any) => ({
            itemInstanceId: item.itemInstanceId,
            itemId: item.itemId,
            catalogVersion: item.catalogVersion,
            purchaseDate: item.purchaseDate,
            remainingUses: item.remainingUses,
            customData: item.customData ? Object.fromEntries(item.customData) : {},
          })),
        };
      },

      grantItem: async (playerId: string, itemId: string, catalogVersion: string = 'default') => {
        const itemInstanceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await PlayerInventory.findOneAndUpdate(
          {
            titleId: context.titleId,
            playerId: playerId || context.playerId,
          },
          {
            $push: {
              items: {
                itemInstanceId,
                itemId,
                catalogVersion,
                purchaseDate: new Date(),
              },
            },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );

        return { itemInstanceId, itemId };
      },

      addVirtualCurrency: async (playerId: string, currency: string, amount: number) => {
        await PlayerProfile.findOneAndUpdate(
          {
            titleId: context.titleId,
            playerId: playerId || context.playerId,
          },
          {
            $inc: { [`customData.${currency}`]: amount },
            $set: { updatedAt: new Date() },
          },
          { upsert: false }
        );
      },

      subtractVirtualCurrency: async (playerId: string, currency: string, amount: number) => {
        const profile = await PlayerProfile.findOne({
          titleId: context.titleId,
          playerId: playerId || context.playerId,
        });

        const currentAmount = profile?.customData?.get(currency) || 0;
        if (currentAmount < amount) {
          throw new Error('Insufficient funds');
        }

        await PlayerProfile.findOneAndUpdate(
          {
            titleId: context.titleId,
            playerId: playerId || context.playerId,
          },
          {
            $inc: { [`customData.${currency}`]: -amount },
            $set: { updatedAt: new Date() },
          },
          { upsert: false }
        );
      },

      updatePlayerStatistics: async (playerId: string, statistics: Record<string, number>) => {
        const updateOps: any = {};

        for (const [key, value] of Object.entries(statistics)) {
          updateOps[`statistics.${key}`] = value;
        }

        await PlayerProfile.findOneAndUpdate(
          {
            titleId: context.titleId,
            playerId: playerId || context.playerId,
          },
          {
            $set: {
              ...updateOps,
              updatedAt: new Date(),
            },
          },
          { upsert: false }
        );
      },

      log: {
        info: (message: string) => this.logs.push(`[INFO] ${message}`),
        warn: (message: string) => this.logs.push(`[WARN] ${message}`),
        error: (message: string) => this.logs.push(`[ERROR] ${message}`),
      },
    };
  }

  private async logExecution(
    context: ExecutionContext,
    result: any,
    error: string | null,
    executionTimeMs: number
  ): Promise<void> {
    try {
      await CloudScriptExecution.create({
        titleId: context.titleId,
        functionName: context.functionName,
        playerId: context.playerId,
        args: context.args,
        result,
        error,
        executionTimeMs,
      });
    } catch (logError) {
      console.error('Failed to log CloudScript execution:', logError);
    }
  }
}

export const cloudScriptExecutor = new CloudScriptExecutor();
