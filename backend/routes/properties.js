const express = require('express');
const Property = require('../models/Property');
const router = express.Router();
const geocoder = require('../utils/geocoder'); // Assuming you have a geocoder utility
const { protect, authorize } = require('../middleware/authMiddleware'); // <-- NEW: Import protect and authorize


// @route   GET /api/properties
// @desc    Get all properties with optional filters and keyword search
// @access  Public (authentication can be added later if needed for all GETs)
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
            const bedroomsQuery = {};
            if (req.query.bedroomsMin) bedroomsQuery.$gte = Number(req.query.bedroomsMin);
            if (req.query.maxBedrooms) bedroomsQuery.$lte = Number(req.query.maxBedrooms);
            if (Object.keys(bedroomsQuery).length > 0) query.bedrooms = bedroomsQuery;
        }
    }

    // 5. Filtering by bathrooms
    if (req.query.bathrooms || req.query.bathroomsMin || req.query.maxBathrooms) {
        if (req.query.bathrooms) {
            query.bathrooms = Number(req.query.bathrooms);
        } else {
            const bathroomsQuery = {};
            if (req.query.bathroomsMin) bathroomsQuery.$gte = Number(req.query.bathroomsMin);
            if (req.query.maxBathrooms) bathroomsQuery.$lte = Number(req.query.maxBathrooms);
            if (Object.keys(bathroomsQuery).length > 0) query.bathrooms = bathroomsQuery;
        }
    }

    // Filter by Agent ID (if an agent is logged in and filter requested)
    if (req.query.agent) {
      query.agent = req.query.agent;
    }

    const properties = await Property.find(query);
    res.status(200).json({ success: true, count: properties.length, data: properties });

  } catch (err) {
    console.error('Get Properties Error (Backend):', err);
    res.status(500).json({ success: false, error: 'Server Error: Could not retrieve properties' });
  }
});

// @route   GET /api/properties/:id
// @desc    Get single property by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    res.status(200).json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid property ID format' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});


// @route   POST /api/properties
// @desc    Add a new property
// @access  Private (Agent only) - protected route
router.post('/', protect, async (req, res) => { // <-- protect middleware applied here
  try {
    // Assuming req.user is populated by authentication middleware
    req.body.agent = req.user.id; // Assign logged-in user as agent

    // Geocode location
    let propertyCoordinates;
    if (req.body.location) {
        const geoResult = await geocoder.geocode(req.body.location);
        if (geoResult && geoResult.length > 0) {
            const { latitude, longitude } = geoResult[0];
            propertyCoordinates = {
                type: 'Point',
                coordinates: [longitude, latitude] // GeoJSON stores as [longitude, latitude]
            };
            console.log(`DEBUG (Geocoding): Found coordinates for ${req.body.location} - Lat: ${latitude}, Lon: ${longitude}`);
        } else {
            console.log(`DEBUG (Geocoding): No coordinates found for ${req.body.location}, proceeding without coordinates.`);
        }
    } else {
        console.log("DEBUG (Geocoding): No location provided, skipping geocoding.");
    }


    const property = await Property.create({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      currency: req.body.currency,
      propertyType: req.body.propertyType,
      listingType: req.body.listingType,
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      livingRooms: req.body.livingRooms,
      contactName: req.body.contactName,
      location: req.body.location,
      photos: req.body.photos, // Array of photo URLs
      agent: req.body.agent,
      coordinates: propertyCoordinates,
      isAvailable: req.body.isAvailable, // Added isAvailable
    });
    console.log('DEBUG (Property Creation): Property saved to DB with ID:', property._id);
    console.log('DEBUG (Property Creation): Saved coordinates:', property.coordinates);

    res.status(201).json({ success: true, data: property });

  } catch (err) {
    console.error('Add Property Error (Backend):', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const message = `A property with this ${field} already exists.`;
      return res.status(400).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: err.message || 'Server Error during property creation' });
  }
});


// @route   PUT /api/properties/:id
// @desc    Update property by ID
// @access  Private (Owner or Admin only)
router.put('/:id', protect, async (req, res) => { // <-- protect middleware applied here
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Make sure user is property owner or admin
    if (property.agent.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: `User ${req.user.id} is not authorized to update this property` });
    }

    // Geocode location if provided in update
    if (req.body.location && req.body.location !== property.location) { // Only geocode if location changed
        const geoResult = await geocoder.geocode(req.body.location);
        if (geoResult && geoResult.length > 0) {
            const { latitude, longitude } = geoResult[0];
            req.body.coordinates = {
                type: 'Point',
                coordinates: [longitude, latitude]
            };
        } else {
            req.body.coordinates = undefined; // Clear coordinates if new location not found
        }
    } else if (req.body.location === '') { // If location explicitly cleared
        req.body.coordinates = undefined;
    }


    property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return the updated document
      runValidators: true // Run Mongoose validators on update
    });

    res.status(200).json({ success: true, data: property });

  } catch (err) {
    console.error('Update Property Error (Backend):', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid property ID format' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});


// @route   DELETE /api/properties/:id
// @desc    Delete property by ID
// @access  Private (Owner or Admin only)
router.delete('/:id', protect, async (req, res) => { // <-- protect middleware applied here
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Make sure user is property owner or admin
    if (property.agent.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: `User ${req.user.id} is not authorized to delete this property` });
    }

    await property.deleteOne(); // Use deleteOne() to trigger pre/post hooks if any

    res.status(200).json({ success: true, message: 'Property deleted successfully' });

  } catch (err) {
    console.error(err);
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid property ID format' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});


module.exports = router;