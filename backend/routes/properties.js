const express = require('express');
const Property = require('../models/Property');
const router = express.Router();

// @route   GET /api/properties
// @desc    Get all properties with optional filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const query = {}; // Initialize an empty query object

    // 1. Filtering by listingType (e.g., ?listingType=For%20Sale)
    if (req.query.listingType) {
      query.listingType = req.query.listingType;
    }

    // 2. Filtering by propertyType (e.g., ?propertyType=House)
    if (req.query.propertyType) {
      query.propertyType = req.query.propertyType;
    }

    // 3. Filtering by bedrooms (e.g., ?bedrooms=3 or ?bedrooms[gte]=2)
    // For exact match: ?bedrooms=3
    if (req.query.bedrooms) {
      query.bedrooms = Number(req.query.bedrooms);
    }
    // For range: ?bedroomsMin=2&bedroomsMax=4
    if (req.query.bedroomsMin || req.query.bedroomsMax) {
      query.bedrooms = {};
      if (req.query.bedroomsMin) {
        query.bedrooms.$gte = Number(req.query.bedroomsMin);
      }
      if (req.query.bedroomsMax) {
        query.bedrooms.$lte = Number(req.query.bedroomsMax);
      }
    }

    // 4. Filtering by bathrooms (similar to bedrooms)
    if (req.query.bathrooms) {
      query.bathrooms = Number(req.query.bathrooms);
    }
    if (req.query.bathroomsMin || req.query.bathroomsMax) {
      query.bathrooms = {};
      if (req.query.bathroomsMin) {
        query.bathrooms.$gte = Number(req.query.bathroomsMin);
      }
      if (req.query.bathroomsMax) {
        query.bathrooms.$lte = Number(req.query.bathroomsMax);
      }
    }

    // 5. Filtering by price range (e.g., ?priceMin=10000000&priceMax=50000000)
    if (req.query.priceMin || req.query.priceMax) {
      query.price = {};
      if (req.query.priceMin) {
        query.price.$gte = Number(req.query.priceMin);
      }
      if (req.query.priceMax) {
        query.price.$lte = Number(req.query.priceMax);
      }
    }

    // Add other filters as needed (e.g., location, features like garden/parking)
    if (req.query.location) {
        // Use a regular expression for partial match, case-insensitive
        query.location = { $regex: req.query.location, $options: 'i' };
    }
    if (req.query.hasGarden === 'true') {
        // Assuming you add a 'hasGarden' boolean field to your PropertySchema
        // query.hasGarden = true;
    }
    // ... add more filter logic here based on your schema and needs

    console.log("Backend received filter query:", req.query);
    console.log("MongoDB query object:", query);

    const properties = await Property.find(query); // Pass the dynamically built query

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