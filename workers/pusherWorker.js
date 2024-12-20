//workers\pusherWorker.js

const { parentPort } = require('worker_threads');
const { addJob } = require('../queue');

async function pushMessage() {
  // Add job to the BullMQ queue
  await addJob({ content: 'Message from Pusher' });
  console.log('Message pushed to the queue');
  parentPort.postMessage('pushed');
}

setInterval(pushMessage, 1000);

