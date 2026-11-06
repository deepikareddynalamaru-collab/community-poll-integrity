const { z } = require('zod');
const mongoose = require('mongoose');
const { BadRequestError } = require('../utils/errors');

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

const validate = ({ body, query, params }) => {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      if (params) {
        req.params = params.parse(req.params);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  validate,
  objectIdSchema,
};

