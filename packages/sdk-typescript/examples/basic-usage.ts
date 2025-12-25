/**
 * NullStack TypeScript SDK - Basic Usage Examples
 */

import { NullStackClient, NullStackError } from '@nullstack/sdk';

async function runExamples() {
  // Initialize the client
  const client = new NullStackClient({
    titleId: 'your-title-id',
    apiUrl: 'https://api.nullstack.com',
  });

  try {
    // ============================================================================
    // EXAMPLE 1: Anonymous Login (Good for mobile games)
    // ============================================================================
    console.log('=== Example 1: Anonymous Login ===');
    const anonymousAuth = await client.loginAnonymous({
      deviceId: 'device-12345',
      createAccount: true,
    });
    console.log('Player ID:', anonymousAuth.playerId);
    console.log('Newly Created:', anonymousAuth.newlyCreated);

    // ============================================================================
    // EXAMPLE 2: Email Registration and Login
    // ============================================================================
    console.log('\n=== Example 2: Registration and Login ===');

    // Register
    const registerAuth = await client.register({
      email: 'player@example.com',
      password: 'securePassword123',
      username: 'player123',
      displayName: 'Pro Player',
    });
    console.log('Registered Player ID:', registerAuth.playerId);

    // Login
    const loginAuth = await client.loginWithEmail({
      email: 'player@example.com',
      password: 'securePassword123',
    });
    console.log('Logged in Player ID:', loginAuth.playerId);

    // ============================================================================
    // EXAMPLE 3: Player Profile Management
    // ============================================================================
    console.log('\n=== Example 3: Player Profile ===');

    // Get profile
    const profile = await client.getProfile();
    console.log('Display Name:', profile.displayName);
    console.log('Email:', profile.email);
    console.log('Created:', profile.created);

    // Update profile
    await client.updateProfile({
      displayName: 'Elite Gamer',
      avatarUrl: 'https://example.com/avatar.png',
    });
    console.log('Profile updated!');

    // ============================================================================
    // EXAMPLE 4: Player Data (Key-Value Storage)
    // ============================================================================
    console.log('\n=== Example 4: Player Data ===');

    // Save player data
    await client.setData({
      data: {
        level: 25,
        experience: 12500,
        settings: {
          soundEnabled: true,
          musicVolume: 0.8,
          language: 'en',
        },
        achievements: ['first_blood', 'speed_demon', 'collector'],
        lastPlayed: new Date().toISOString(),
      },
      permission: 'Private',
    });
    console.log('Player data saved!');

    // Get specific data
    const playerData = await client.getData({
      keys: ['level', 'experience', 'settings'],
    });
    console.log('Level:', playerData.data.level?.value);
    console.log('Experience:', playerData.data.experience?.value);
    console.log('Settings:', playerData.data.settings?.value);

    // ============================================================================
    // EXAMPLE 5: Virtual Economy
    // ============================================================================
    console.log('\n=== Example 5: Economy ===');

    // Check currencies
    const currencies = await client.getCurrencies();
    currencies.forEach((currency) => {
      console.log(`${currency.currencyCode}: ${currency.amount}`);
    });

    // Purchase an item
    const purchase = await client.purchaseItem({
      itemId: 'sword_legendary',
      currencyCode: 'GO',
      price: 1000,
    });
    console.log('Purchased Item Instance:', purchase.itemInstanceId);

    // Get inventory
    const inventory = await client.getInventory();
    console.log(`You have ${inventory.length} items`);
    inventory.forEach((item) => {
      console.log(`- ${item.displayName} (${item.itemClass})`);
    });

    // Consume an item (e.g., potion)
    if (inventory.length > 0) {
      const consumeResult = await client.consumeItem({
        itemInstanceId: inventory[0].itemInstanceId,
        consumeCount: 1,
      });
      console.log('Remaining Uses:', consumeResult.remainingUses);
    }

    // ============================================================================
    // EXAMPLE 6: Leaderboards
    // ============================================================================
    console.log('\n=== Example 6: Leaderboards ===');

    // Submit score
    const scoreResult = await client.submitScore({
      statisticName: 'HighScore',
      value: 15000,
      metadata: {
        level: 10,
        difficulty: 'hard',
        time: 180,
      },
    });
    console.log('Your Position:', scoreResult.position);
    console.log('Your Score:', scoreResult.value);

    // Get leaderboard
    const leaderboard = await client.getLeaderboard({
      statisticName: 'HighScore',
      startPosition: 0,
      maxResults: 10,
    });
    console.log('\nTop 10 Players:');
    leaderboard.leaderboard.forEach((entry) => {
      console.log(`${entry.position}. ${entry.displayName}: ${entry.score}`);
    });

    // ============================================================================
    // EXAMPLE 7: CloudScript Execution
    // ============================================================================
    console.log('\n=== Example 7: CloudScript ===');

    const cloudScriptResult = await client.execute({
      functionName: 'grantDailyReward',
      functionParameter: {
        day: 7,
        consecutiveDays: 3,
      },
      generatePlayStreamEvent: true,
    });
    console.log('CloudScript Result:', cloudScriptResult.functionResult);
    console.log('Execution Time:', cloudScriptResult.executionTimeSeconds, 'seconds');

    if (cloudScriptResult.logs) {
      console.log('Logs:');
      cloudScriptResult.logs.forEach((log) => {
        console.log(`[${log.level}] ${log.message}`);
      });
    }

    // ============================================================================
    // EXAMPLE 8: Analytics
    // ============================================================================
    console.log('\n=== Example 8: Analytics ===');

    // Track level completion
    await client.trackEvent({
      eventName: 'level_completed',
      properties: {
        level: 5,
        score: 10000,
        duration: 120,
        difficulty: 'hard',
        deaths: 3,
      },
    });

    // Track purchase
    await client.trackEvent({
      eventName: 'item_purchased',
      properties: {
        itemId: 'sword_legendary',
        itemName: 'Legendary Sword',
        price: 1000,
        currency: 'GO',
      },
    });

    // Track session
    await client.trackEvent({
      eventName: 'session_start',
      properties: {
        platform: 'web',
        version: '1.0.0',
        device: 'desktop',
      },
    });

    console.log('Events tracked!');

    // ============================================================================
    // EXAMPLE 9: Complete Game Flow
    // ============================================================================
    console.log('\n=== Example 9: Complete Game Flow ===');

    // 1. Login
    await client.loginAnonymous({ deviceId: 'device-67890' });

    // 2. Load player progress
    const progress = await client.getData({ keys: ['level', 'experience'] });
    const currentLevel = (progress.data.level?.value as number) || 1;
    const currentXP = (progress.data.experience?.value as number) || 0;
    console.log(`Current Level: ${currentLevel}, XP: ${currentXP}`);

    // 3. Play the game (simulate)
    const earnedXP = 500;
    const newXP = currentXP + earnedXP;
    const newLevel = Math.floor(newXP / 1000) + 1;

    // 4. Save progress
    await client.setData({
      data: {
        level: newLevel,
        experience: newXP,
        lastPlayed: new Date().toISOString(),
      },
    });

    // 5. Submit score to leaderboard
    await client.submitScore({
      statisticName: 'PlayerLevel',
      value: newLevel,
    });

    // 6. Track analytics
    await client.trackEvent({
      eventName: 'level_up',
      properties: {
        oldLevel: currentLevel,
        newLevel: newLevel,
        experience: newXP,
      },
    });

    console.log(`Level Up! You are now level ${newLevel}`);

  } catch (error) {
    const nsError = error as NullStackError;
    console.error('Error Code:', nsError.code);
    console.error('Error Message:', nsError.message);
    console.error('HTTP Status:', nsError.status);

    if (nsError.details) {
      console.error('Details:', nsError.details);
    }
  } finally {
    // Clean up
    client.logout();
  }
}

// Run the examples
runExamples();
