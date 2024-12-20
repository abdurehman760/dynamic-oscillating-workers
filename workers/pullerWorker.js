//workers\pullerWorker.js

const { Worker } = require('bullmq');
const { redisConfig } = require('../state');
const { messageQueue } = require('../queue');

// Initialize the Worker to process the queue
const worker = new Worker('messages', async job => {
  console.log('Processed message:', job.data);
  await job.remove();
}, {
  connection: redisConfig,
  limiter: {
    groupKey: 'group1',
    max: 10,             // Max jobs per second
    duration: 1000,      // Rate limit duration in ms
  }
});

// Log completed and failed job events
worker.on('completed', job => {
  console.log(`Job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job failed: ${job.id}, Error: ${err.message}`);
});
