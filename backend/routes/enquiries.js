const express = require('express');
const Enquiry = require('../models/Enquiry'); // Import Enquiry model
const Property = require('../models/Property'); // Import Property model (to get agent ID)
const asyncHandler = require('express-async-handler'); // For error handling
const { protect, authorize } = require('../middleware/authMiddleware'); // For authentication

const router = express.Router();

// @route   POST /api/enquiries
// @desc    Send a new enquiry about a property
// @access  Private (user must be logged in)
router.post('/', protect, asyncHandler(async (req, res) => {
  const { propertyId, message } = req.body; // propertyId is the ID of the property

  // Ensure propertyId and message are provided
  if (!propertyId || !message) {
    res.status(400);
    throw new Error('Property ID and message are required');
  }

  // Find the property to get the recipient agent's ID
  const property = await Property.findById(propertyId);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  // Create the enquiry
  const enquiry = await Enquiry.create({
    property: propertyId,
    sender: req.user.id, // Logged-in user is the sender
    recipientAgent: property.agent, // The agent who owns the property
    message,
  });

  res.status(201).json({
    success: true,
    message: 'Enquiry sent successfully',
    data: enquiry,
  });
}));

// @route   GET /api/enquiries/my-sent
// @desc    Get all enquiries sent by the logged-in user
// @access  Private
router.get('/my-sent', protect, asyncHandler(async (req, res) => {
  // Find enquiries where sender ID matches logged-in user's ID
  const enquiries = await Enquiry.find({ sender: req.user.id })
    .populate('property', 'title location photos') // Populate property details
    .populate('recipientAgent', 'name phoneNumber email'); // Populate recipient agent details

  res.status(200).json({
    success: true,
    count: enquiries.length,
    data: enquiries,
  });
}));

// @route   GET /api/enquiries/my-received
// @desc    Get all enquiries received by the logged-in agent
// @access  Private (agent only)
router.get('/my-received', protect, authorize('agent'), asyncHandler(async (req, res) => {
  // Find enquiries where recipientAgent ID matches logged-in agent's ID
  const enquiries = await Enquiry.find({ recipientAgent: req.user.id })
    .populate('property', 'title location photos') // Populate property details
    .populate('sender', 'name phoneNumber email'); // Populate sender details

  res.status(200).json({
    success: true,
    count: enquiries.length,
    data: enquiries,
  });
}));

module.exports = router;