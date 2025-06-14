const express = require('express');
const Property = require('../models/Property');
const router = express.Router();
const geocoder = require('../utils/geocoder');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/properties
router.get('/', async (req, res) => {
  try {
    const query = {};

    // Keyword search (title, description, city)
    if (req.query.keyword) {
      const keyword = req.query.keyword;
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { "location.city": { $regex: keyword, $options: 'i' } }
      ];
    }

    // Listing type filter
    if (req.query.listingType) query.listingType = req.query.listingType;

    // Property type filter (array support)
    if (req.query.propertyType) query.propertyType = { $in: req.query.propertyType.split(',') };

    // Bedrooms filter
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

    // Bathrooms filter
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

    // Price range filter
    if (req.query.priceMin || req.query.priceMax) {
      query.price = {};
      if (req.query.priceMin) query.price.$gte = Number(req.query.priceMin);
      if (req.query.priceMax) query.price.$lte = Number(req.query.priceMax);
      if (Object.keys(query.price).length === 0) delete query.price;
    }

    // Region filter (location.region)
    if (req.query.region) {
      query['location.region'] = req.query.region;
    }
    // City filter (location.city)
    if (req.query.city) {
      query['location.city'] = { $regex: req.query.city, $options: 'i' };
    }

    // Amenities filter (must include all specified amenities)
    if (req.query.amenities) {
      // Example: amenities=Parking,Swimming Pool
      const amenitiesArr = req.query.amenities.split(',').map(a => a.trim());
      query.amenities = { $all: amenitiesArr };
    }

    // Agent filter
    if (req.query.agent) {
      query.agent = req.query.agent;
    } else {
      query.isAvailable = true;
    }

    // Sorting
    // sort options: newest, price_asc, price_desc
    let sort = {};
    if (req.query.sort) {
      if (req.query.sort === 'newest') sort = { createdAt: -1 };
      else if (req.query.sort === 'price_asc') sort = { price: 1 };
      else if (req.query.sort === 'price_desc') sort = { price: -1 };
    } else {
      sort = { createdAt: -1 }; // default: newest first
    }

    // Pagination (optional, add if desired)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // DEBUG
    console.log('DEBUG (Backend Properties GET): Final Query:', query, 'Sort:', sort);

    const properties = await Property.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, count: properties.length, data: properties });

  } catch (err) {
    console.error('Get Properties Error (Backend):', err);
    res.status(500).json({ success: false, error: 'Server Error: Could not retrieve properties' });
  }
});

// @route   GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

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
router.post('/', protect, authorize('agent'), async (req, res) => {
  try {
    req.body.agent = req.user.id;

    let propertyCoordinates;
    // Use city or region name for geocoding if location is structured
    let locationString = '';
    if (req.body.location) {
      if (typeof req.body.location === 'object') {
        locationString = `${req.body.location.city || ''}, ${req.body.location.region || ''}`;
      } else {
        locationString = req.body.location;
      }
      const geoResult = await geocoder.geocode(locationString);
      if (geoResult && geoResult.length > 0) {
        const { latitude, longitude } = geoResult[0];
        propertyCoordinates = {
          type: 'Point',
          coordinates: [longitude, latitude]
        };
      }
    }

    const property = await Property.create({
      ...req.body,
      coordinates: propertyCoordinates,
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
    });

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
router.put('/:id', protect, async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (property.agent.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: `User ${req.user.id} is not authorized to update this property` });
    }

    // Geocode if location updated
    let locationString = '';
    if (req.body.location && JSON.stringify(req.body.location) !== JSON.stringify(property.location)) {
      if (typeof req.body.location === 'object') {
        locationString = `${req.body.location.city || ''}, ${req.body.location.region || ''}`;
      } else {
        locationString = req.body.location;
      }
      const geoResult = await geocoder.geocode(locationString);
      if (geoResult && geoResult.length > 0) {
        const { latitude, longitude } = geoResult[0];
        req.body.coordinates = {
          type: 'Point',
          coordinates: [longitude, latitude]
        };
      } else {
        req.body.coordinates = undefined;
      }
    } else if (req.body.location === '') {
      req.body.coordinates = undefined;
    }

    const updateFields = { ...req.body };
    if (updateFields.isAvailable !== undefined) {
      updateFields.isAvailable = updateFields.isAvailable;
    }

    property = await Property.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
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
router.delete('/:id', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (property.agent.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: `User ${req.user.id} is not authorized to delete this property` });
    }

    await property.deleteOne();

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