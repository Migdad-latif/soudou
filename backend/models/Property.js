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
    enum: ['House', 'Apartment', 'Land', 'Commercial'],
    required: [true, 'Please select a property type']
  },
  listingType: {
    type: String,
    enum: ['For Sale', 'For Rent'], // Options are 'For Sale' or 'For Rent'
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
  location: {
    type: String, // For MVP, we'll use a string for location (e.g., "Conakry, Ratoma")
    required: [true, 'Please add a location']
  },
  photos: {
    type: [String], // Array of strings for image URLs (e.g., from cloud storage)
    default: []
  },
  agent: {
    type: mongoose.Schema.ObjectId, // Link to a User (agent) document
    ref: 'User', // Refers to the 'User' model (which we'll create next)
    required: false // For MVP, allow properties without an agent initially
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

module.exports = mongoose.model('Property', PropertySchema);