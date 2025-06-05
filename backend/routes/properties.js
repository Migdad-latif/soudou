const express = require('express');
const Property = require('../models/Property');
const router = express.Router();

// @route   GET /api/properties
// @desc    Get all properties with optional filters and keyword search
// @access  Public
router.get('/', async (req, res) => {
  try {
    const query = {};

    // 1. Keyword Search (e.g., ?keyword=conakry)
    if (req.query.keyword) {
      const keyword = req.query.keyword;
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { location: { $regex: keyword, $options: 'i' } }
      ];
    }

    // 2. Filtering by listingType (e.g., ?listingType=For%20Sale)
    if (req.query.listingType) {
      query.listingType = req.query.listingType;
    }

    // 3. Filtering by propertyType (e.g., ?propertyType=House,Apartment)
    if (req.query.propertyType) {
      query.propertyType = { $in: req.query.propertyType.split(',') };
    }

    // 4. Filtering by bedrooms
    if (req.query.bedrooms || req.query.bedroomsMin || req.query.maxBedrooms) {
        if (req.query.bedrooms) {
            query.bedrooms = Number(req.query.bedrooms);
        } else {
            query.bedrooms = {};
            if (req.query.bedroomsMin) {
                query.bedrooms.$gte = Number(req.query.bedroomsMin);
            }
            if (req.query.maxBedrooms) {
                // DEBUGGING LOGS (can remove after verification)
                console.log(`DEBUG: Received maxBedrooms query: ${req.query.maxBedrooms}`);
                const maxBedroomsNum = Number(req.query.maxBedrooms);
                console.log(`DEBUG: Converted maxBedrooms to number: ${maxBedroomsNum}`);
                if (isNaN(maxBedroomsNum)) {
                    console.warn(`WARNING: maxBedrooms conversion resulted in NaN. Value: ${req.query.maxBedrooms}`);
                }
                query.bedrooms.$lte = maxBedroomsNum;
            }
        }
    }

    // 5. Filtering by bathrooms
    if (req.query.bathrooms || req.query.bathroomsMin || req.query.maxBathrooms) {
        if (req.query.bathrooms) {
            query.bathrooms = Number(req.query.bathrooms);
        } else {
            query.bathrooms = {};
            if (req.query.bathroomsMin) {
                query.bathrooms.$gte = Number(req.query.bathroomsMin);
            }
            if (req.query.maxBathrooms) {
                query.bathrooms.$lte = Number(req.query.maxBathrooms);
            }
        }
    }

    // 6. Filtering by price range
    if (req.query.priceMin || req.query.priceMax) {
      query.price = {};
      if (req.query.priceMin) {
        query.price.$gte = Number(req.query.priceMin);
      }
      if (req.query.maxPrice) { // Ensure this matches frontend param name
        query.price.$lte = Number(req.query.maxPrice);
      }
    }

    console.log("Backend received filter query (req.query):", req.query);
    console.log("MongoDB query object (final):", query);

    const properties = await Property.find(query);

    res.json({ success: true, count: properties.length, data: properties });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @route   GET /api/properties/:id
// @desc    Get single property by ID
// @access  Public (for now)
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    res.status(200).json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    // Check if it's a CastError (invalid MongoDB ID format)
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid property ID format' });
    }
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