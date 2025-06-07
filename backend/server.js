// MUST be the very first executable line to load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// Import routes (using require)
const properties = require('./routes/properties');
const auth = require('./routes/auth');
const uploads = require('./routes/uploads');

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in the .env file!');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));
// --- End MongoDB Connection ---

// Middleware: Process incoming requests
app.use(express.json());

// Basic Route to confirm server is alive
app.get('/', (req, res) => {
  res.send('Welcome to the Soudou Backend API!');
});

// --- Simple POST endpoint for frontend connectivity test (keep for now) ---
app.post('/test-frontend-post', (req, res) => {
  console.log('DEBUG: Received POST request to /test-frontend-post');
  console.log('DEBUG: Request Body:', req.body);
  res.status(200).json({ success: true, message: 'Simple POST received by backend!', data: req.body });
});
// --- END Simple POST endpoint ---

// Mount routers
app.use('/api/properties', properties);
app.use('/api/auth', auth);
app.use('/api/uploads', uploads);

// --- GLOBAL ERROR HANDLING MIDDLEWARE (MUST BE LAST) ---
app.use((err, req, res, next) => {
  console.error('GLOBAL EXPRESS ERROR HANDLER:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error: An unexpected error occurred'
  });
});
// --- END GLOBAL ERROR HANDLING MIDDLEWARE ---

// Start the Server
app.listen(PORT, () => {
  console.log(`Soudou Backend server running on port ${PORT}`);
  console.log(`Access it at: http://localhost:${PORT}`);
  console.log(`Test frontend POST endpoint at: http://192.168.1.214:3000/test-frontend-post`);
});