const express = require('express');
const { z } = require('zod');
const {
  createPoll,
  getPolls,
  getMyPolls,
  getPollById,
  votePoll,
  getPollResults,
} = require('../controllers/poll.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validate, objectIdSchema } = require('../middleware/validate.middleware');

const router = express.Router();

// All poll routes require authentication
router.use(authMiddleware);

const createPollSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().default(''),
  options: z.array(z.union([
    z.string().trim().min(1, 'Option text cannot be empty'),
    z.object({ text: z.string().trim().min(1, 'Option text cannot be empty') })
  ])).min(2, 'Must have at least 2 options').max(10, 'Must not exceed 10 options'),
  closesAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format for closesAt',
  }),
  eligibility: z
    .object({
      type: z.enum(['any', 'domain', 'invite']),
      domain: z.string().trim().optional().nullable(),
      allowedEmails: z.array(z.string().trim().email()).optional(),
    })
    .optional(),
});

const pollQuerySchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
});

const pollIdParamsSchema = z.object({
  id: objectIdSchema,
});

const voteBodySchema = z.object({
  optionId: objectIdSchema,
});

// Create a new poll
router.post('/', validate({ body: createPollSchema }), createPoll);

// List all polls with optional ?status=open|closed
router.get('/', validate({ query: pollQuerySchema }), getPolls);

// IMPORTANT: Define /mine BEFORE /:id so it is never shadowed!
router.get('/mine', getMyPolls);

// Get single poll detail
router.get('/:id', validate({ params: pollIdParamsSchema }), getPollById);

// Submit vote for a poll
router.post('/:id/vote', validate({ params: pollIdParamsSchema, body: voteBodySchema }), votePoll);

// Get closed poll results (locked with 403 when open)
router.get('/:id/results', validate({ params: pollIdParamsSchema }), getPollResults);

module.exports = router;
