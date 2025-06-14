const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title']
  },
  description: {
    type: String,
    required: false
  },
  price: {
    type: Number,
    required: [true, 'Please add a price']
  },
  currency: {
    type: String,
    default: "GNF"
  },
  propertyType: {
    type: [String],
    required: [true, 'Please specify property type(s)'],
    enum: ['House', 'Apartment', 'Land', 'Commercial', 'Office']
  },
  listingType: {
    type: String,
    required: [true, 'Please specify listing type'],
    enum: ['For Sale', 'For Rent']
  },
  bedrooms: {
    type: Number,
    default: 0
  },
  bathrooms: {
    type: Number,
    default: 0
  },
  livingRooms: {
    type: Number,
    default: 0
  },
  contactName: {
    type: String,
    required: false
  },
  // Updated location field for region & city support
  location: {
    region: {
      type: String,
      required: true,
      enum: [
        'Basse-Guinee',      // Lower Guinea
        'Moyenne-Guinee',    // Middle Guinea
        'Haute-Guinee',      // Upper Guinea
        'Guinee-Forestiere'  // Forested Guinea
      ]
    },
    city: {
      type: String,
      required: false
    }
  },
  amenities: {
    type: [String],
    enum: [
      'Parking', 'Balcony', 'Furnished', 'Swimming Pool', 'Garden',
      'Gym', 'Security', 'Elevator', 'Air Conditioning', 'Internet'
    ],
    default: []
  },
  photos: {
    type: [String],
    default: []
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Geospatial index for location-based queries
PropertySchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('Property', PropertySchema);