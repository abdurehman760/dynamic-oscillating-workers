# Dynamic Oscillating Worker Threads with Push-Pull Role Reversal

## Overview
This Node.js application demonstrates the dynamic orchestration of worker threads with alternating roles (Pushers and Pullers) and state persistence using Redis. The Pushers add messages to a queue, and the Pullers process them. After processing 10 messages, roles are switched dynamically. The system gracefully shuts down while persisting the state to Redis, allowing restoration upon restart.

---

## Key Features
- **Dynamic Role Reversal**: Pushers and Pullers alternate roles after every 10 messages.
- **Scalability**: Incremental spawning of Pushers and Pullers with limits (10 maximum for each role).
- **State Persistence**: Save and restore state using Redis.
- **Graceful Shutdown**: Proper cleanup of workers and state saving on exit.
- **Express API**: Start/stop processes, fetch system state, and stream state updates via SSE.

---

## Prerequisites
1. **Node.js** (v16 or above).
2. **Docker** to run Redis Stack.

---

## Installing and Running Redis Stack
To manage state persistence, the application uses Docker Redis Stack. Follow these steps to set it up:

1. **Pull the Redis Stack Docker Image:**
   ```bash
   docker pull redis/redis-stack:latest
   ```

2. **Run Redis Stack:**
   ```bash
   docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
   ```

3. **Verify Redis is Running:**
   - Access Redis Insight (a GUI tool) at: [http://localhost:8001](http://localhost:8001)
   - Ensure Redis server is running on port `6379`.

---

## Project Setup

1. **Clone the Repository:**
   ```bash
   git clone <repository_url>
   cd <repository_folder>
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Application:**
   ```bash
   node server.js
   ```

4. **Access the API:**
   - Start process: `POST http://localhost:3000/start`
   - Stop process: `POST http://localhost:3000/stop`
   - Get system state: `GET http://localhost:3000/state`
   - Get Redis state: `GET http://localhost:3000/getredisstate`
   - Stream state updates via SSE: `GET http://localhost:3000/events`

---

## File Structure
```
├── server.js       # Express server with API routes
├── master.js       # Manages workers, role switches, and state persistence
├── state.js        # Redis state handling
├── queue.js        # BullMQ queue management
├── workers
│   ├── pusherWorker.js # Pushes messages to the queue
│   └── pullerWorker.js # Processes messages from the queue
└── README.md       # Project documentation
```

---

## Detailed Explanation

### `server.js`
Handles the Express API endpoints:
- **Start Process:** Starts the worker management process.
- **Stop Process:** Stops all workers and saves the state.
- **State Endpoints:** Provide current system and Redis state.
- **SSE Endpoint:** Streams system state updates in real-time.

### `master.js`
Core logic for managing workers, switching roles, and handling state.

#### Key Functions:
1. **startProcess:**
   - Restores the last known state from Redis.
   - Spawns initial Pusher and Puller workers if no state exists.

2. **stopProcess:**
   - Terminates all active workers.
   - Saves the current state to Redis.

3. **spawnPusher/spawnPuller:**
   - Creates new Pusher or Puller workers while ensuring limits.

4. **switchRoles:**
   - Alternates between Pusher and Puller roles every 10 messages.
   - Dynamically adjusts the number of workers based on the current phase.

5. **loadPreviousState:**
   - Retrieves and restores state from Redis.

6. **getSystemState:**
   - Returns a snapshot of the current system state.

### `state.js`
Manages Redis connections and state persistence.

#### Functions:
1. **saveState:**
   - Saves the system state to Redis.

2. **loadState:**
   - Retrieves the last saved state from Redis.

3. **redisConfig:**
   - Contains the configuration for Redis connection.

### `queue.js`
Handles BullMQ queue setup and job management.

#### Functions:
1. **messageQueue:**
   - Configures the BullMQ queue.

2. **addJob:**
   - Adds a new job to the queue with provided data.

### `workers/pusherWorker.js`
Pushes messages to the BullMQ queue.
- **Interval:** Sends a message every second.
- Communicates with the master thread upon successful push.

### `workers/pullerWorker.js`
Processes messages from the BullMQ queue.
- **Limiter:** Restricts processing rate to 10 jobs per second.
- Removes jobs after processing.

---

## API Documentation

### **Start Process**
**Endpoint:** `POST /start`
- Starts the worker management process.
- Initializes workers and restores state if available.

### **Stop Process**
**Endpoint:** `POST /stop`
- Stops all workers.
- Persists the current state to Redis.

### **Get System State**
**Endpoint:** `GET /state`
- Returns the current state of workers and role switches.

### **Get Redis State**
**Endpoint:** `GET /getredisstate`
- Returns the last saved state from Redis.

### **Stream State Updates**
**Endpoint:** `GET /events`
- Streams real-time state updates using Server-Sent Events (SSE).

---

## Environment Variables
You can configure Redis connection settings in `state.js`:
```javascript
const redisConfig = { host: 'localhost', port: 6379 };
```

---

## Graceful Shutdown
The application listens for `SIGINT` and ensures:
- All workers are terminated.
- The current state is saved to Redis.

---

## Future Improvements
- Add support for configurable limits (e.g., MAX_PUSHERS, MAX_PULLERS).
- Enhance state restoration to handle partial failures.
- Implement metrics for monitoring worker performance.

---

## License
This project is licensed under the MIT License.

