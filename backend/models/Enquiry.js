const mongoose = require('mongoose');

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
  // --- MODIFIED: conversation array instead of single message/replyMessage ---
  conversation: [ // Array to store messages in the thread
    {
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
    },
  ],
  // --- END MODIFIED ---
  status: { // e.g., 'open', 'read', 'closed', 'new_message_from_agent', 'new_message_from_user'
    type: String,
    enum: ['open', 'read', 'replied', 'closed'], // Simplified for now, can be expanded
    default: 'open', // Initial status
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Enquiry', EnquirySchema);