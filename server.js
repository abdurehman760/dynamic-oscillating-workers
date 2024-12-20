//server.js
const express = require('express');
const { startProcess, stopProcess, getSystemState } = require('./master');
const { subscriber } = require('./state'); 
const app = express();
const port = 3000;

app.use(express.json());

// Start the process
let isProcessRunning = false; // Variable to track whether the process is running

// Start the process
app.post('/start', async (req, res) => {
  await startProcess();
  isProcessRunning = true; // Mark process as running
  res.send('Process started');
});

// Stop the process
app.post('/stop', async (req, res) => {
  stopProcess();
  isProcessRunning = false; // Mark process as stopped
  res.send('Process stopped');
});

// Get current system state
app.get('/state', (req, res) => {
  const state = getSystemState();
  res.json(state);
});



// SSE endpoint to stream the system state updates
app.get('/events', (req, res) => {
  if (!isProcessRunning) {
    return res.status(400).send('Process is not running. Start the process first.');
  }

  // Set the headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send updates every second
  const interval = setInterval(() => {
    const state = getSystemState();
    res.write(`data: ${JSON.stringify(state)}\n\n`);
  }, 1000);
  
  // Close the connection after client disconnects
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
