const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title for the property'],
    trim: true,
    maxlength: [100, 'Title can not be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price']
  },
  currency: {
    type: String,
    default: 'GNF' // Guinea Franc
  },
  propertyType: {
    type: String,
    enum: ['House', 'Apartment', 'Land', 'Commercial', 'Office'],
    required: [true, 'Please select a property type']
  },
  listingType: {
    type: String,
    enum: ['For Sale', 'For Rent'],
    required: [true, 'Please specify if property is for sale or rent']
  },
  bedrooms: {
    type: Number,
    min: 0,
    default: 0
  },
  bathrooms: {
    type: Number,
    min: 0,
    default: 0
  },
  livingRooms: {
    type: Number,
    min: 0,
    default: 0
  },
  contactName: {
    type: String,
    required: [true, 'Please provide a contact name (your name or agency name)']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
      required: false
    }
  },
  photos: {
    type: [String],
    default: []
  },
  agent: { // Define agent field as a reference to the User model
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true // Property must have an associated agent
  },
  isAvailable: { // Adding isAvailable based on previous user request
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Property', PropertySchema);