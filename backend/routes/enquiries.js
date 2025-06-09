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
    deletedForSender: { $ne: true } // <-- NEW: Filter out if soft-deleted by sender
  })
    .populate('property', 'title location photos')
    .populate('sender', 'name phoneNumber email')
    .populate('recipientAgent', 'name phoneNumber email')
    .populate('conversation.senderId', 'name phoneNumber email');

  // Filter messages within the conversation that are soft-deleted for this user
  const filteredEnquiries = enquiries.map(enquiry => {
    const conversation = enquiry.conversation.filter(msg => {
      return !(msg.deletedFor && msg.deletedFor.includes(req.user._id));
    });
    return {
      ...enquiry.toObject(), // Convert Mongoose document to plain object
      conversation,
    };
  });

  res.status(200).json({
    success: true,
    count: filteredEnquiries.length,
    data: filteredEnquiries,
  });
}));

// @route   GET /api/enquiries/my-received
// @desc    Get all enquiries received by the logged-in agent
// @access  Private (agent only)
router.get('/my-received', protect, authorize('agent'), asyncHandler(async (req, res) => {
  const enquiries = await Enquiry.find({ 
    recipientAgent: req.user.id,
    deletedForAgent: { $ne: true } // <-- NEW: Filter out if soft-deleted by agent
  })
    .populate('property', 'title location photos')
    .populate('sender', 'name phoneNumber email')
    .populate('recipientAgent', 'name phoneNumber email')
    .populate('conversation.senderId', 'name phoneNumber email');

  // Filter messages within the conversation that are soft-deleted for this user
  const filteredEnquiries = enquiries.map(enquiry => {
    const conversation = enquiry.conversation.filter(msg => {
      return !(msg.deletedFor && msg.deletedFor.includes(req.user._id));
    });
    return {
      ...enquiry.toObject(), // Convert Mongoose document to plain object
      conversation,
    };
  });

  res.status(200).json({
    success: true,
    count: filteredEnquiries.length,
    data: filteredEnquiries,
  });
}));

// @route   DELETE /api/enquiries/:enquiryId/messages/:messageIndex
// @desc    Soft delete a message for the logged-in user only
// @access  Private
router.delete('/:enquiryId/messages/:messageIndex', protect, asyncHandler(async (req, res) => {
  const { enquiryId, messageIndex } = req.params;

  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

  const message = enquiry.conversation[messageIndex];
  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  const isParticipant = enquiry.sender.toString() === req.user.id ||
                         enquiry.recipientAgent.toString() === req.user.id;
  if (!isParticipant) {
    res.status(403);
    throw new Error('Not authorized to modify this message');
  }

  // Ensure deletedFor array exists on the message
  if (!message.deletedFor) {
    message.deletedFor = [];
  }
  // Add user's ID to deletedFor array
  if (!message.deletedFor.includes(req.user._id)) { // Check if not already included
    message.deletedFor.push(req.user._id);
  }

  await enquiry.save();

  res.status(200).json({ success: true, message: 'Message deleted for you only' });
}));

// @route   PATCH /api/enquiries/:id/delete
// @desc    Soft delete an enquiry (hide the entire thread for the requesting user only)
// @access  Private
router.patch('/:id/delete', protect, asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);

  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

  const userId = req.user._id.toString();

  if (enquiry.sender.toString() === userId) {
    enquiry.deletedForSender = true;
  } else if (enquiry.recipientAgent.toString() === userId) {
    enquiry.deletedForAgent = true;
  } else {
    res.status(403);
    throw new Error('You are not authorized to delete this enquiry');
  }

  await enquiry.save();

  res.status(200).json({ success: true, message: 'Enquiry hidden for this user' });
}));

module.exports = router;