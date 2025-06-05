// Load environment variables from .env file.
// This MUST be the first line of code to ensure variables are available.
require('dotenv').config();

const express = require('express');   // Import the Express.js framework
const mongoose = require('mongoose'); // Import Mongoose for MongoDB interaction
const app = express();                // Create an Express application instance
const PORT = process.env.PORT || 5000; // Get port from .env or default to 5000

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI; // Get the MongoDB connection string from .env

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in the .env file!');
    process.exit(1); // Exit the process if URI is missing
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));
// --- End MongoDB Connection ---

// Middleware: Process incoming requests
app.use(express.json()); // Parses JSON payloads from incoming requests

// Basic Route: A simple endpoint to test if your server is running
app.get('/', (req, res) => {
  res.send('Welcome to the Soudou Backend API!');
});

// Start the Server: Make your Express app listen for incoming requests
app.listen(PORT, () => {
  console.log(`Soudou Backend server running on port ${PORT}`);
  console.log(`Access it at: http://localhost:${PORT}`);
});