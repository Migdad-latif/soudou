const cloudinary = require('cloudinary').v2; // Import Cloudinary v2
require('dotenv').config(); // Load .env file

// Configure Cloudinary using credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Use HTTPS for all requests
});

module.exports = cloudinary;