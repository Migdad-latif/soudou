const express = require('express');
const Property = require('../models/Property');
const router = express.Router();
const geocoder = require('../utils/geocoder');
const asyncHandler = require('express-async-handler');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/properties
// @desc    Get all properties with optional filters and keyword search (already implemented)
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.keyword) {
    const keyword = req.query.keyword;
    query.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { location: { $regex: keyword, $options: 'i' } }
    ];
  }
  if (req.query.listingType) query.listingType = req.query.listingType;
  if (req.query.propertyType) query.propertyType = { $in: req.query.propertyType.split(',') };
  if (req.query.bedrooms || req.query.bedroomsMin || req.query.maxBedrooms) {
      if (req.query.bedrooms) query.bedrooms = Number(req.query.bedrooms);
      else { query.bedrooms = {}; if (req.query.bedroomsMin) query.bedrooms.$gte = Number(req.query.bedroomsMin); if (req.query.maxBedrooms) query.bedrooms.$lte = Number(req.query.maxBedrooms); }
  }
  if (req.query.bathrooms || req.query.bathroomsMin || req.query.maxBathrooms) {
          if (req.query.bathrooms) query.bathrooms = Number(req.query.bathrooms);
          else { query.bathrooms = {}; if (req.query.bathroomsMin) query.bathrooms.$gte = Number(req.query.bathroomsMin); if (req.query.maxBathrooms) query.bathrooms.$lte = Number(req.query.maxBathrooms); }
      }
  if (req.query.priceMin || req.query.maxPrice) {
    query.price = {};
    if (req.query.priceMin) query.price.$gte = Number(req.query.priceMin);
    if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
  }

  console.log("Backend received filter query (req.query):", req.query);
  console.log("MongoDB query object (final):", query);

  const properties = await Property.find(query);
  res.json({ success: true, count: properties.length, data: properties });
}));

// @route   POST /api/properties
// @desc    Add a new property (already implemented)
// @access  Private (protected by JWT middleware)
router.post('/', protect, asyncHandler(async (req, res) => {
  const {
    title, description, price, currency, propertyType, listingType, bedrooms,
    bathrooms, livingRooms, contactName, location, photos, coordinates
  } = req.body;

  let propertyCoordinates = null;

  if (coordinates && coordinates.type === 'Point' && coordinates.coordinates && coordinates.coordinates.length === 2) {
      propertyCoordinates = coordinates;
  } else {
      const locationToGeocode = location.includes('Guinea') ? location : `${location}, Guinea`;
      const loc = await geocoder.geocode(locationToGeocode);
      if (!loc || loc.length === 0) { res.status(400); throw new Error('Could not find coordinates for the provided location.'); }
      const latitude = loc[0].latitude; const longitude = loc[0].longitude;
      propertyCoordinates = { type: 'Point', coordinates: [longitude, latitude], };
  }

  const property = await Property.create({
    title, description, price, currency, propertyType, listingType, bedrooms,
    bathrooms, livingRooms, contactName, location, photos,
    agent: req.user.id,
    coordinates: propertyCoordinates,
  });

  res.status(201).json({ success: true, data: property });
}));


// @route   PUT /api/properties/:id
// @desc    Update a property (already implemented)
// @access  Private (owner only)
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const {
    title, description, price, currency, propertyType, listingType, bedrooms,
    bathrooms, livingRooms, contactName, location, photos, coordinates
  } = req.body;

  let propertyToUpdate = await Property.findById(req.params.id);

  if (!propertyToUpdate) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (propertyToUpdate.agent.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Not authorized to update this property');
  }

  let updatedCoordinates = propertyToUpdate.coordinates;
  if (location && location !== propertyToUpdate.location) {
      if (coordinates && coordinates.type === 'Point' && coordinates.coordinates && coordinates.coordinates.length === 2) {
          updatedCoordinates = coordinates;
      } else {
          const locationToGeocode = location.includes('Guinea') ? location : `${location}, Guinea`;
          const loc = await geocoder.geocode(locationToGeocode);
          if (!loc || loc.length === 0) {
              res.status(400);
              throw new Error('Could not find coordinates for the updated location.');
          }
          const latitude = loc[0].latitude; const longitude = loc[0].longitude;
          updatedCoordinates = { type: 'Point', coordinates: [longitude, latitude] };
      }
  }

  const updatedFields = {
    title, description, price, currency, propertyType, listingType, bedrooms,
    bathrooms, livingRooms, contactName, location, photos,
    coordinates: updatedCoordinates,
  };

  propertyToUpdate = await Property.findByIdAndUpdate(req.params.id, updatedFields, {
    new: true,
    runValidators: true
  });

  res.status(200).json({ success: true, data: propertyToUpdate });
}));


// @route   GET /api/properties/myproperties
// @desc    Get properties added by the logged-in agent
// @access  Private (agent only)
router.get('/myproperties', protect, authorize('agent'), asyncHandler(async (req, res) => {
  const agentProperties = await Property.find({ agent: req.user.id });

  res.status(200).json({
    success: true,
    count: agentProperties.length,
    data: agentProperties,
  });
}));

// @route   GET /api/properties/:id
// @desc    Get single property by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => { // Use asyncHandler
  // --- NEW: Populate the 'agent' field to get agent's details ---
  const property = await Property.findById(req.params.id).populate('agent', 'phoneNumber'); // Populate 'agent' and select 'phoneNumber'
  // --- END NEW ---

  if (!property) { res.status(404); throw new Error('Property not found'); }
  res.status(200).json({ success: true, data: property });
}));


// TEST ROUTE (keep as is)
// @route   POST /api/properties/test
router.post('/test', (req, res) => {
  res.status(200).json({ message: 'Test POST route successful!', receivedBody: req.body });
});

module.exports = router;