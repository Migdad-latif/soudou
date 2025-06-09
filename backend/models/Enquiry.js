const mongoose = require('mongoose');

const EnquirySchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.ObjectId,
    ref: 'Property',
    required: [true, 'Enquiry must be linked to a property'],
  },
  sender: { // The user who sent the enquiry
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Enquiry must have a sender'],
  },
  recipientAgent: { // The agent who owns the property (extracted from property)
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Enquiry must have a recipient agent'],
  },
  message: {
    type: String,
    required: [true, 'Enquiry message cannot be empty'],
    maxlength: [500, 'Message cannot be more than 500 characters'],
  },
  status: { // e.g., 'sent', 'read', 'replied'
    type: String,
    enum: ['sent', 'read', 'replied'],
    default: 'sent',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Enquiry', EnquirySchema);