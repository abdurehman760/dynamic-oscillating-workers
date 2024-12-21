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

// Start the process with state restoration
async function startProcess() {
  try {
    const stateRestored = await loadPreviousState();

    if (!stateRestored) {
      console.log('No previous state found. Starting fresh.');
      spawnPusher();
      spawnPuller();
    }

    console.log('Starting process with restored state:', getSystemState());
  } catch (err) {
    console.error('Error starting process:', err);
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  await stopProcess();
  process.exit(0);
});

async function stopProcess() {
  try {
    console.log('Shutting down workers...');

    // Terminate all workers asynchronously
    await Promise.all([
      ...pushers.map(worker => worker.terminate().catch(err => console.error('Error terminating pusher:', err))),
      ...pullers.map(worker => worker.terminate().catch(err => console.error('Error terminating puller:', err)))
    ]);

    // Save current state to Redis
    await saveState(getSystemState());

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
    try {
      const worker = new Worker('./workers/pusherWorker.js');
      pushers.push(worker);
      pusherCount++;
      worker.on('message', handleMessage);
      console.log(`Pusher spawned. Total Pushers: ${pusherCount}`);
    } catch (err) {
      console.error('Error spawning pusher:', err);
    }
  }
}

function spawnPuller() {
  if (pullerCount < MAX_PULLERS) {
    try {
      const worker = new Worker('./workers/pullerWorker.js');
      pullers.push(worker);
      pullerCount++;
      console.log(`Puller spawned. Total Pullers: ${pullerCount}`);
    } catch (err) {
      console.error('Error spawning puller:', err);
    }
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

async function switchRoles() {
  roleSwitchCount++;
  currentRole = (roleSwitchCount % 2 === 1) ? 'Puller' : 'Pusher';

  console.log(`Role switch #${roleSwitchCount}. Current role: ${currentRole}`);

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
    if (isIncrementingPusher && pusherCount < MAX_PUSHERS) spawnPusher();
    if (isDecrementingPusher && pusherCount > 1) terminatePusher();
    if (isIncrementingPuller && pullerCount < MAX_PULLERS) spawnPuller();
    if (isDecrementingPuller && pullerCount > 1) terminatePuller();
  }

  await saveState(getSystemState());
}

function terminatePusher() {
  const pusher = pushers.pop();
  if (pusher) {
    pusher.terminate().catch(err => console.error('Error terminating pusher:', err));
    pusherCount--;
    console.log(`Pusher terminated. Total Pushers: ${pusherCount}`);
  }
}

function terminatePuller() {
  const puller = pullers.pop();
  if (puller) {
    puller.terminate().catch(err => console.error('Error terminating puller:', err));
    pullerCount--;
    console.log(`Puller terminated. Total Pullers: ${pullerCount}`);
  }
}

async function loadPreviousState() {
  try {
    const state = await loadState();
    if (state) {
      // Restore state from Redis
      const redisPusherCount = state.pusherCount || 0;
      const redisPullerCount = state.pullerCount || 0;
      messageCount = state.messageCount || 0;
      totalMessageCount = state.totalMessageCount || 0;
      roleSwitchCount = state.roleSwitchCount || 0;
      currentRole = state.currentRole || 'Pusher';

      console.log('Restored state:', state);

      // Clear existing workers to avoid duplication
      await stopProcess();

      // Update global counts to match restored state
      pusherCount = 0;
      pullerCount = 0;

      // Spawn workers based on the restored state
      for (let i = 0; i < redisPusherCount; i++) spawnPusher();
      for (let i = 0; i < redisPullerCount; i++) spawnPuller();

      return true;
    }
    return false;
  } catch (err) {
    console.error('Error loading state from Redis:', err);
    return false;
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
