const express = require('express');
const Property = require('../models/Property');
const router = express.Router();
const geocoder = require('../utils/geocoder');

// @route   GET /api/properties
// @desc    Get all properties with optional filters and keyword search
// @access  Public
router.get('/', async (req, res) => {
  try {
    const query = {};

    // 1. Keyword Search
    if (req.query.keyword) {
      const keyword = req.query.keyword;
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { location: { $regex: keyword, $options: 'i' } }
      ];
    }

    // 2. Filtering by listingType
    if (req.query.listingType) {
      query.listingType = req.query.listingType;
    }

    // 3. Filtering by propertyType
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
                query.bedrooms.$lte = Number(req.query.maxBedrooms);
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
    if (req.query.priceMin || req.query.maxPrice) {
      query.price = {};
      if (req.query.priceMin) {
        query.price.$gte = Number(req.query.priceMin);
      }
      if (req.query.maxPrice) {
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
router.post('/', async (req, res) => {
  const {
    title,
    description,
    price,
    currency,
    propertyType,
    listingType,
    bedrooms,
    bathrooms,
    livingRooms,
    contactName,
    location,
    photos,
    agent,
    coordinates
  } = req.body;

  let propertyCoordinates = null;

  try {
    if (coordinates && coordinates.type === 'Point' && coordinates.coordinates && coordinates.coordinates.length === 2) {
        propertyCoordinates = coordinates;
        console.log("DEBUG (Geocoding): Using coordinates provided by frontend (GPS).");
    } else {
        const locationToGeocode = location.includes('Guinea') ? location : `${location}, Guinea`;
        console.log(`DEBUG (Geocoding): Attempting to geocode location: "${locationToGeocode}"`);

        const loc = await geocoder.geocode(locationToGeocode);

        console.log('DEBUG (Geocoding): Geocoding results:', loc);

        if (!loc || loc.length === 0) {
          console.log(`WARNING (Geocoding): Geocoding failed or returned no results for: "${locationToGeocode}". Please try a more specific address.`);
          return res.status(400).json({ success: false, error: 'Could not find coordinates for the provided location. Please try a more specific address.' });
        }

        const latitude = loc[0].latitude;
        const longitude = loc[0].longitude;
        propertyCoordinates = {
            type: 'Point',
            coordinates: [longitude, latitude],
        };
        console.log(`DEBUG (Geocoding): Found coordinates via Nominatim - Lat: ${latitude}, Lon: ${longitude}`);
    }


    const property = await Property.create({
      title, description, price, currency, propertyType, listingType, bedrooms,
      bathrooms, livingRooms, contactName, location, photos, agent,
      coordinates: propertyCoordinates,
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

// TEST ROUTE (keep as is)
// @route   POST /api/properties/test
router.post('/test', (req, res) => {
  res.status(200).json({ message: 'Test POST route successful!', receivedBody: req.body });
});

module.exports = router;