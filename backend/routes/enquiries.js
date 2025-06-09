const express = require('express');
const Enquiry = require('../models/Enquiry');
const Property = require('../models/Property');
const asyncHandler = require('express-async-handler');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/enquiries
// @desc    Send a new enquiry (initiates a conversation thread)
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
    conversation: [
      {
        senderId: req.user.id,
        message: message,
      },
    ],
    status: 'open',
    deletedFor: {
      sender: false,
      agent: false,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Enquiry sent successfully',
    data: enquiry,
  });
}));

// @route   POST /api/enquiries/:id/message
// @desc    Add a new message to an existing enquiry conversation thread
// @access  Private (only original sender or recipient agent can add message)
router.post('/:id/message', protect, asyncHandler(async (req, res) => {
  const enquiryId = req.params.id;
  const { message } = req.body;

  let enquiry = await Enquiry.findById(enquiryId);

  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

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

  enquiry.conversation.push({ senderId: req.user.id, message: message });

  if (req.user.role === 'agent') {
    enquiry.status = 'replied';
  } else {
    enquiry.status = 'open';
  }
  enquiry.repliedAt = Date.now();

  await enquiry.save();

  res.status(200).json({ success: true, message: 'Message added to conversation', data: enquiry });
}));

// @route   PATCH /api/enquiries/:id/status
// @desc    Update the status of an enquiry (e.g., mark as 'read')
// @access  Private (sender or recipient can mark as read)
router.patch('/:id/status', protect, asyncHandler(async (req, res) => {
  const enquiryId = req.params.id;
  const { status } = req.body;

  let enquiry = await Enquiry.findById(enquiryId);

  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

  if (
    enquiry.sender.toString() !== req.user.id &&
    enquiry.recipientAgent.toString() !== req.user.id
  ) {
    res.status(401);
    throw new Error('Not authorized to update this enquiry status');
  }

  enquiry.status = status;
  await enquiry.save();

  res.status(200).json({ success: true, message: `Enquiry status updated to ${status}`, data: enquiry });
}));

// @route   GET /api/enquiries/my-sent
// @desc    Get all enquiries sent by the logged-in user
// @access  Private
router.get('/my-sent', protect, asyncHandler(async (req, res) => {
  const enquiries = await Enquiry.find({
    sender: req.user.id,
    'deletedFor.sender': { $ne: true }
  })
    .populate('property', 'title location photos')
    .populate('sender', 'name phoneNumber email')
    .populate('recipientAgent', 'name phoneNumber email')
    .populate('conversation.senderId', 'name phoneNumber email');

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
  const enquiries = await Enquiry.find({
    recipientAgent: req.user.id,
    'deletedFor.agent': { $ne: true }
  })
    .populate('property', 'title location photos')
    .populate('sender', 'name phoneNumber email')
    .populate('recipientAgent', 'name phoneNumber email')
    .populate('conversation.senderId', 'name phoneNumber email');

  res.status(200).json({
    success: true,
    count: enquiries.length,
    data: enquiries,
  });
}));

// @route   DELETE /api/enquiries/:id
// @desc    Soft delete an enquiry for the logged-in user (not for everyone)
// @access  Private (sender or agent only)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);

  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

  const isSender = enquiry.sender.toString() === req.user.id;
  const isAgent = enquiry.recipientAgent.toString() === req.user.id;

  if (!isSender && !isAgent) {
    res.status(401);
    throw new Error('Not authorized to delete this enquiry');
  }

  if (isSender) {
    enquiry.deletedFor.sender = true;
  } else if (isAgent) {
    enquiry.deletedFor.agent = true;
  }

  await enquiry.save();

  res.status(200).json({ success: true, message: 'Enquiry deleted for you only' });
}));

module.exports = router;
