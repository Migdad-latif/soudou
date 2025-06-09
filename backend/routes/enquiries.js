const express = require('express');
const Enquiry = require('../models/Enquiry');
const Property = require('../models/Property');
const asyncHandler = require('express-async-handler');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/enquiries
// @desc    Send a new enquiry about a property (already implemented)
// @access  Private (user must be logged in)
router.post('/', protect, asyncHandler(async (req, res) => {
  const { propertyId, message } = req.body;

  if (!propertyId || !message) {
    res.status(400);
    throw new Error('Property ID and message are required');
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  const enquiry = await Enquiry.create({
    property: propertyId,
    sender: req.user.id,
    recipientAgent: property.agent,
    message,
  });

  res.status(201).json({
    success: true,
    message: 'Enquiry sent successfully',
    data: enquiry,
  });
}));

// @route   GET /api/enquiries/my-sent
// @desc    Get all enquiries sent by the logged-in user (already implemented)
// @access  Private
router.get('/my-sent', protect, asyncHandler(async (req, res) => {
  const enquiries = await Enquiry.find({ sender: req.user.id })
    .populate('property', 'title location photos')
    .populate('recipientAgent', 'name phoneNumber email');

  res.status(200).json({
    success: true,
    count: enquiries.length,
    data: enquiries,
  });
}));

// @route   GET /api/enquiries/my-received
// @desc    Get all enquiries received by the logged-in agent (already implemented)
// @access  Private (agent only)
router.get('/my-received', protect, authorize('agent'), asyncHandler(async (req, res) => {
  const enquiries = await Enquiry.find({ recipientAgent: req.user.id })
    .populate('property', 'title location photos')
    .populate('sender', 'name phoneNumber email');

  res.status(200).json({
    success: true,
    count: enquiries.length,
    data: enquiries,
  });
}));

// --- ROUTES FOR REPLIES AND STATUS UPDATE ---

// @route   PATCH /api/enquiries/:id/status
// @desc    Update the status of an enquiry (e.g., mark as 'read')
// @access  Private (sender or recipient can mark as read, recipient can mark as replied)
router.patch('/:id/status', protect, asyncHandler(async (req, res) => {
  const enquiryId = req.params.id;
  const { status } = req.body;

  let enquiry = await Enquiry.findById(enquiryId);

  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

  // Authorize: Only sender or recipientAgent can update status
  if (
    enquiry.sender.toString() !== req.user.id &&
    enquiry.recipientAgent.toString() !== req.user.id
  ) {
    res.status(401);
    throw new Error('Not authorized to update this enquiry status');
  }

  // Prevent changing status to 'replied' if not the recipient agent
  if (status === 'replied' && enquiry.recipientAgent.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Only the recipient agent can mark an enquiry as replied');
  }

  enquiry.status = status;
  await enquiry.save();

  res.status(200).json({ success: true, message: `Enquiry status updated to ${status}`, data: enquiry });
}));

// @route   POST /api/enquiries/:id/message
// @desc    Send a reply to an enquiry (or add a new message to conversation)
// @access  Private (only original sender or recipient agent can add to thread)
router.post('/:id/message', protect, asyncHandler(async (req, res) => {
  const enquiryId = req.params.id;
  const { message } = req.body;

  let enquiry = await Enquiry.findById(enquiryId);

  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

  // Authorize: Only the original sender or the recipient agent can add messages to this thread
  if (
    enquiry.sender.toString() !== req.user.id &&
    enquiry.recipientAgent.toString() !== req.user.id
  ) {
    res.status(401);
    throw new Error('Not authorized to add messages to this enquiry');
  }

  if (!message || message.trim() === '') {
    res.status(400);
    throw new Error('Message cannot be empty');
  }

  // Add new message to the conversation array
  enquiry.conversation.push({ senderId: req.user.id, message: message });

  // Update status based on who replied (optional, but good for tracking)
  if (req.user.role === 'agent' && enquiry.recipientAgent.toString() === req.user.id) {
    enquiry.status = 'replied'; // Agent replied
  } else if (req.user.role === 'user' && enquiry.sender.toString() === req.user.id) {
    enquiry.status = 'open'; // User responded (agent needs to see it)
  } else {
    enquiry.status = 'open'; // Fallback or specific status
  }
  enquiry.repliedAt = Date.now(); // Update repliedAt timestamp

  await enquiry.save();

  res.status(200).json({ success: true, message: 'Message added to conversation', data: enquiry });
}));

module.exports = router;