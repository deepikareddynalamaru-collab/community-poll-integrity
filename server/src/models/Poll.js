const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      minlength: [1, 'Option text cannot be empty'],
      maxlength: [200, 'Option text cannot exceed 200 characters'],
    },
  },
  {
    _id: true,
  }
);

const eligibilitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['any', 'domain', 'invite'],
      default: 'any',
      required: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    allowedEmails: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const pollSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Poll title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    options: {
      type: [optionSchema],
      validate: {
        validator: function (options) {
          return Array.isArray(options) && options.length >= 2 && options.length <= 10;
        },
        message: 'A poll must have between 2 and 10 options',
      },
    },
    closesAt: {
      type: Date,
      required: [true, 'Closing date and time is required'],
    },
    eligibility: {
      type: eligibilitySchema,
      default: () => ({ type: 'any' }),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property for computed status - NEVER stored in DB
pollSchema.virtual('status').get(function () {
  return new Date() < this.closesAt ? 'open' : 'closed';
});

const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;

