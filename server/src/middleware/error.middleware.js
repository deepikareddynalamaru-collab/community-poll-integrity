const { AppError } = require('../utils/errors');

const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const isVoteDuplicate =
      (err.keyPattern && err.keyPattern.pollId && err.keyPattern.userId) ||
      (err.message && err.message.includes('pollId_1_userId_1')) ||
      (err.message && err.message.includes('pollId'));
    const isEmailDuplicate =
      (err.keyPattern && err.keyPattern.email) ||
      (err.message && err.message.includes('email_1'));

    if (isEmailDuplicate) {
      code = 'EMAIL_ALREADY_REGISTERED';
      message = 'Email is already registered';
    } else if (isVoteDuplicate) {
      code = 'DUPLICATE_VOTE';
      message = 'You have already voted in this poll';
    } else {
      code = 'DUPLICATE_KEY';
      message = 'Duplicate entry detected';
    }
  }

  // Handle Mongoose CastError (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid format for field: ${err.path}`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const firstKey = Object.keys(err.errors)[0];
    message = firstKey ? err.errors[firstKey].message : 'Validation failed';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  }

  // Handle Zod Error
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const issue = err.issues && err.issues[0];
    message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation error';
  }

  res.status(statusCode).json({
    error: {
      message,
      code,
    },
  });
};

module.exports = errorMiddleware;
