const { Worker } = require('worker_threads');
const { saveState, loadState } = require('./state');

let pushers = [];
let pullers = [];
let messageCount = 0;
let totalMessageCount = 0;
let roleSwitchCount = 0;

let pusherCount = 0;
let pullerCount = 0;
let currentRole = 'Pusher'; // Default role

const MAX_MESSAGES_BEFORE_SWITCH = 10;
const MAX_PUSHERS = 10;
const MAX_PULLERS = 10;

// Flags to control increments and decrements
let isIncrementingPusher = true;
let isDecrementingPusher = false;
let isIncrementingPuller = false;
let isDecrementingPuller = false;

async function startProcess() {
  try {
    await loadPreviousState(); // Load previous state before starting workers

    console.log('Starting process with restored state:', getSystemState());

    // Ensure there is at least one Pusher and one Puller initially
    if (pusherCount === 0) {
      spawnPusher();
    }

    if (pullerCount === 0) {
      spawnPuller();
    }
  } catch (err) {
    console.error('Error starting process:', err);
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  await stopProcess(); // Ensure state is saved before exiting
  process.exit(0);
});

async function stopProcess() {
  try {
    // Terminate all workers
    pushers.forEach(worker => worker.terminate());
    pullers.forEach(worker => worker.terminate());

    // Save current state to Redis
    await saveState({
      pusherCount,
      pullerCount,
      messageCount,
      totalMessageCount,
      roleSwitchCount,
      currentRole,
    });

    console.log('State saved successfully. Process shutdown complete.');

    // Clear worker arrays
    pushers = [];
    pullers = [];
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
}

function spawnPusher() {
  if (pusherCount < MAX_PUSHERS) {
    const worker = new Worker('./workers/pusherWorker.js');
    pushers.push(worker);
    pusherCount++;
    worker.on('message', handleMessage);
    console.log(`Pusher spawned. Total Pushers: ${pusherCount}`);
  }
}

function spawnPuller() {
  if (pullerCount < MAX_PULLERS) {
    const worker = new Worker('./workers/pullerWorker.js');
    pullers.push(worker);
    pullerCount++;
    console.log(`Puller spawned. Total Pullers: ${pullerCount}`);
  }
}

function handleMessage() {
  totalMessageCount++;

  if (messageCount >= MAX_MESSAGES_BEFORE_SWITCH) {
    switchRoles();
    messageCount = 1;
  } else {
    messageCount++;
  }
}

function switchRoles() {
  roleSwitchCount++;
  currentRole = (roleSwitchCount % 2 === 1) ? 'Puller' : 'Pusher';

  console.log(`Role switch #${roleSwitchCount}. Current role: ${currentRole}`);

  // Handle transitions when limits are reached
  if (pusherCount === MAX_PUSHERS && pullerCount === 1) {
    isIncrementingPusher = false;
    isDecrementingPusher = true;
    isIncrementingPuller = true;
    isDecrementingPuller = false;
    console.log('Switching to decrementing pushers and incrementing pullers.');
  }

  if (pullerCount === MAX_PULLERS && pusherCount === 1) {
    isIncrementingPusher = true;
    isDecrementingPusher = false;
    isIncrementingPuller = false;
    isDecrementingPuller = true;
    console.log('Switching to decrementing pullers and incrementing pushers.');
  }

  if (roleSwitchCount % 2 === 0) {
    if (isIncrementingPusher && pusherCount < MAX_PUSHERS) {
      spawnPusher();
    }

    if (isDecrementingPusher && pusherCount > 1) {
      const pusher = pushers.pop();
      pusher.terminate();
      pusherCount--;
      console.log(`Pusher terminated. Total Pushers: ${pusherCount}`);
    }

    if (isIncrementingPuller && pullerCount < MAX_PULLERS) {
      spawnPuller();
    }

    if (isDecrementingPuller && pullerCount > 1) {
      const puller = pullers.pop();
      puller.terminate();
      pullerCount--;
      console.log(`Puller terminated. Total Pullers: ${pullerCount}`);
    }
  }

  // Save the updated state
  saveState({
    pusherCount,
    pullerCount,
    messageCount,
    totalMessageCount,
    roleSwitchCount,
    currentRole,
  });
}

async function loadPreviousState() {
  try {
    const state = await loadState();
    if (state) {
      pusherCount = state.pusherCount || 0;
      pullerCount = state.pullerCount || 0;
      messageCount = state.messageCount || 0;
      totalMessageCount = state.totalMessageCount || 0;
      roleSwitchCount = state.roleSwitchCount || 0;
      currentRole = state.currentRole || 'Pusher';

      console.log('Restored state:', state);

      // Spawn workers based on the restored state
      for (let i = 0; i < pusherCount; i++) spawnPusher();
      for (let i = 0; i < pullerCount; i++) spawnPuller();
    } else {
      
    }
  } catch (err) {
    console.error('Error loading state from Redis:', err);
  }
}

function getSystemState() {
  return {
    pusherCount,
    pullerCount,
    messageCount,
    totalMessageCount,
    roleSwitchCount,
    currentRole,
  };
}

module.exports = { startProcess, stopProcess, getSystemState };
