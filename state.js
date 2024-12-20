//state.js
const Redis = require('ioredis');

// Redis configuration (can be customized)
const redisConfig = { host: 'localhost', port: 6379 };

// Create Redis connection using redisConfig
const redis = new Redis(redisConfig);

async function saveState(state) {
  try {
    await redis.set('systemState', JSON.stringify(state));
    console.log('State saved to Redis:', state);
  } catch (err) {
    console.error('Error saving state to Redis:', err);
  }
}

async function loadState() {
  try {
    const state = await redis.get('systemState');
    console.log('State loaded from Redis:', state);
    return state ? JSON.parse(state) : null;
  } catch (err) {
    console.error('Error loading state from Redis:', err);
    return null;
  }
}

module.exports = { saveState, loadState, redisConfig };

