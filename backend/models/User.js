const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing/comparison
const jwt = require('jsonwebtoken'); // For generating JWT tokens

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    unique: false, // Email is not required to be unique
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please add a valid email'
    ],
    required: false // Email is optional
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true, // Phone number must be unique for login
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Don't return password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'agent', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  savedProperties: { // Array of property IDs for user favorites
    type: [mongoose.Schema.ObjectId],
    ref: 'Property',
    default: []
  }
});

// Encrypt password using bcrypt (pre-save hook)
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) { // Only hash if password is modified
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and return JWT token
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: this.role, phoneNumber: this.phoneNumber }, // Include phone number in payload
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );
};

// Static method to find user by email or phone
UserSchema.statics.findByEmailOrPhone = async function(identifier) {
  const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
  if (isEmail) {
    return await this.findOne({ email: identifier }).select('+password');
  } else {
    return await this.findOne({ phoneNumber: identifier }).select('+password');
  }
};

module.exports = mongoose.model('User', UserSchema);