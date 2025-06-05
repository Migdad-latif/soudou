const express = require('express');
const Property = require('../models/Property'); // Path is relative to routes/properties.js
const router = express.Router();

// @route   GET /api/properties
// @desc    Get all properties
// @access  Public
router.get('/', async (req, res) => {
  try {
    const properties = await Property.find();
    res.json({ success: true, count: properties.length, data: properties });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @route   POST /api/properties/test
// @desc    Test POST route (diagnostic)
// @access  Public
router.post('/test', (req, res) => {
  res.status(200).json({ message: 'Test POST route successful!', receivedBody: req.body });
});


// @route   POST /api/properties
// @desc    Add a new property
// @access  Public (for now, will add authentication later)
router.post('/', async (req, res) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    // Mongoose validation error (e.g., required fields missing)
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    } else {
      console.error(err);
      res.status(500).json({ success: false, error: 'Server Error' });
    }
  }
});

module.exports = router;