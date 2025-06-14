const express = require('express');
const User = require('../models/User');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware

// Helper function to send token in response
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
router.post('/register', async (req, res) => {
  const { name, phoneNumber, email, password, role } = req.body;

  console.log('DEBUG (Auth Register): Received data:', { name, phoneNumber, email, password: password ? '[PRESENT]' : '[MISSING]', role }); // Log received data

  try {
    const user = await User.create({
      name, phoneNumber, ...(email && { email }), password, role
    });
    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error("Register API Error:", err);
    if (err.code === 11000) { // Duplicate key error
      const field = Object.keys(err.keyValue)[0];
      let message = `A user with this ${field} already exists.`;
      return res.status(400).json({ success: false, error: message });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error during registration' });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { phoneNumber, password } = req.body;

  console.log('DEBUG (Auth Login): Received data:', { phoneNumber, password: password ? '[PRESENT]' : '[MISSING]' }); // Log received data

  if (!phoneNumber || !password) {
    return res.status(400).json({ success: false, error: 'Please enter a phone number and password' });
  }

  try {
    const user = await User.findOne({ phoneNumber }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);

  } catch (err) {
    console.error("Login API Error:", err);
    res.status(500).json({ success: false, error: 'Server Error during login' });
  }
});


// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, data: user });
});

// @route   PUT /api/auth/me
// @desc    Update profile (name, email)
// @access  Private
router.put('/me', protect, async (req, res) => {
  const { name, email } = req.body;

  console.log('DEBUG (Auth Update Profile): User ID:', req.user.id, 'Received data:', { name, email }); // Log received data

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save({ validateBeforeSave: true });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Update Profile API Error:", err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error during profile update' });
  }
});


// @route   POST /api/auth/save-property/:propertyId
// @desc    Save/Unsave a property to user's favorites
// @access  Private
router.post('/save-property/:propertyId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const propertyId = req.params.propertyId;

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isSaved = user.savedProperties.includes(propertyId);
    let action;

    if (isSaved) {
      user.savedProperties = user.savedProperties.filter(id => id.toString() !== propertyId);
      action = 'unsaved';
    } else {
      user.savedProperties.push(propertyId);
      action = 'saved';
    }

    await user.save();
    res.status(200).json({ success: true, action: action, data: user.savedProperties });
  } catch (err) {
    console.error("Error saving/unsaving property:", err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @route   GET /api/auth/saved-properties
// @desc    Get user's saved properties (populated)
// @access  Private
router.get('/saved-properties', protect, async (req, res) => {
  try {
    // Populate the savedProperties field
    const user = await User.findById(req.user.id).populate('savedProperties');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, count: user.savedProperties.length, data: user.savedProperties });
  } catch (err) {
    console.error("Error fetching saved properties:", err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});


module.exports = router;