const express = require('express');
const User = require('../models/User');
const Property = require('../models/Property'); // <-- NEW: Import Property model
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware
const asyncHandler = require('express-async-handler'); // Import asyncHandler

const router = express.Router();

// Helper function to send token in response (already exists)
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const cookieExpireDays = Number(process.env.JWT_EXPIRE_COOKIE);
  const actualCookieExpireDays = isNaN(cookieExpireDays) ? 30 : cookieExpireDays;

  const options = {
    expires: new Date(Date.now() + actualCookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role
    }
  });
};


// @route   POST /api/auth/register
// @desc    Register user (already implemented)
// @access  Public
router.post('/register', asyncHandler(async (req, res) => { // Use asyncHandler
  const { name, phoneNumber, email, password, role } = req.body;

  const user = await User.create({
    name, phoneNumber, ...(email && { email }), password, role
  });

  sendTokenResponse(user, 201, res);

})); // Removed manual try-catch as asyncHandler handles it


// @route   POST /api/auth/login
// @desc    Login user (already implemented)
// @access  Public
router.post('/login', asyncHandler(async (req, res) => { // Use asyncHandler
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    res.status(400); // Use Express error handling
    throw new Error('Please enter a phone number and password');
  }

  const user = await User.findOne({ phoneNumber }).select('+password');

  if (!user) { res.status(401); throw new Error('Invalid credentials'); }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) { res.status(401); throw new Error('Invalid credentials'); }

  sendTokenResponse(user, 200, res);

})); // Removed manual try-catch as asyncHandler handles it


// @route   GET /api/auth/me
// @desc    Get current logged in user (already implemented)
// @access  Private
router.get('/me', protect, (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

// --- NEW ROUTES FOR SAVED PROPERTIES ---

// @route   POST /api/auth/save-property/:propertyId
// @desc    Toggle saving/unsaving a property for the logged-in user
// @access  Private
router.post('/save-property/:propertyId', protect, asyncHandler(async (req, res) => {
  const propertyId = req.params.propertyId;
  const userId = req.user.id;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  // Check if property is already saved
  const isSaved = user.savedProperties.includes(propertyId);

  if (isSaved) {
    // Unsave the property
    user.savedProperties = user.savedProperties.filter(
      (propId) => propId.toString() !== propertyId
    );
    await user.save();
    res.status(200).json({ success: true, message: 'Property unsaved', action: 'unsaved' });
  } else {
    // Save the property
    user.savedProperties.push(propertyId);
    await user.save();
    res.status(200).json({ success: true, message: 'Property saved', action: 'saved' });
  }
}));

// @route   GET /api/auth/saved-properties
// @desc    Get all properties saved by the logged-in user
// @access  Private
router.get('/saved-properties', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('savedProperties'); // Populate property details

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    count: user.savedProperties.length,
    data: user.savedProperties, // This will contain populated property objects
  });
}));

// --- END NEW ROUTES ---

module.exports = router;