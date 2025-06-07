const express = require('express');
const User = require('../models/User');

const router = express.Router();

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

  try {
    const user = await User.create({
      name, phoneNumber, ...(email && { email }), password, role
    });

    sendTokenResponse(user, 201, res);

  } catch (err) {
    console.error('Registration Error:', err.message);
    if (err.code === 11000) {
      let field = Object.keys(err.keyValue)[0];
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
    console.error('Login Error:', err.message);
    res.status(500).json({ success: false, error: 'Server Error during login' });
  }
});

// @route   GET /api/auth/me
router.get('/me', async (req, res) => {
  res.status(200).json({ success: true, message: 'This route will show logged-in user data.' });
});

module.exports = router;