const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  senderId: { // ID of the specific sender of this message (can be original sender or agent)
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: [true, 'Message cannot be empty'],
    maxlength: [500, 'Message cannot be more than 500 characters'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  deletedFor: { // NEW: Array of user IDs for whom this specific message is soft-deleted
    type: [mongoose.Schema.ObjectId],
    ref: 'User',
    default: []
  }
});

const EnquirySchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.ObjectId,
    ref: 'Property',
    required: [true, 'Enquiry must be linked to a property'],
  },
  sender: { // The user who initiated the enquiry
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Enquiry must have a sender'],
  },
  recipientAgent: { // The agent who owns the property
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Enquiry must have a recipient agent'],
  },
  conversation: [ConversationSchema], // Array to store messages in the thread
  status: { // e.g., 'open', 'read', 'replied', 'closed'
    type: String,
    enum: ['open', 'read', 'replied', 'closed'],
    default: 'open', // Initial status for a new conversation
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  repliedAt: { // Timestamp for when the enquiry was last replied to
    type: Date,
  },
  // NEW FIELDS for soft-delete of entire enquiry for a user
  deletedForSender: {
    type: Boolean,
    default: false
  },
  deletedForAgent: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Enquiry', EnquirySchema);