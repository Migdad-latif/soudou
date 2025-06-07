const NodeGeocoder = require('node-geocoder');
require('dotenv').config(); // Load .env file for potential key/email

const options = {
  provider: 'openstreetmap', // Use OpenStreetMap Nominatim
  // Optional: Add a user agent to identify your application to Nominatim.
  // This is good practice for Nominatim to avoid being blocked.
  // You can put your email or app name here.
  // E.g., 'geocoding.openstreetmap.org/reverse?email=your_email@example.com'
  // You can add NOMINATIM_EMAIL=your_email@example.com in .env and use it
  email: process.env.NOMINATIM_EMAIL,
  // You can increase timeout if you have slow internet
  // timeout: 5000, // geocoding service timeout (2000ms by default)
  // headers: {'user-agent': 'SoudouApp'} // User-Agent header for your app
};

const geocoder = NodeGeocoder(options);

module.exports = geocoder;