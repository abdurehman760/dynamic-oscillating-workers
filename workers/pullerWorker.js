//workers\pullerWorker.js

const { Worker } = require('bullmq');
const { redisConfig } = require('../state');
const { messageQueue } = require('../queue');

// Initialize the Worker to process the queue
const worker = new Worker('messages', async job => {
 
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
 
});

worker.on('failed', (job, err) => {
 
});
