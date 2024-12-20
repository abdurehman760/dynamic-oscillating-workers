//queue.js

const { Queue } = require('bullmq');
const { redisConfig } = require('./state');

// Create a BullMQ queue using the Redis configuration
const messageQueue = new Queue('messages', { connection: redisConfig });

async function addJob(data) {
  try {
    await messageQueue.add('message', data);
    console.log(`[Queue] Job added to queue: ${JSON.stringify(data)}`);
  } catch (err) {
    console.error('[Queue] Error adding job to queue:', err);
  }
}

module.exports = { messageQueue, addJob };

