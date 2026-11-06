const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');
const { checkUserEligibility } = require('../utils/eligibility');
const { calculateResults } = require('../utils/math');

const createPoll = async (req, res, next) => {
  try {
    const { title, description, options, closesAt, eligibility } = req.body;

    const closesAtDate = new Date(closesAt);
    if (isNaN(closesAtDate.getTime())) {
      throw new BadRequestError('Invalid closesAt date format', 'INVALID_CLOSING_TIME');
    }

    if (closesAtDate <= new Date()) {
      throw new BadRequestError('Closing time must be in the future', 'INVALID_CLOSING_TIME');
    }

    // Normalize options format
    const formattedOptions = (options || []).map((opt) =>
      typeof opt === 'string' ? { text: opt.trim() } : { text: opt.text?.trim() }
    );

    if (formattedOptions.length < 2 || formattedOptions.length > 10) {
      throw new BadRequestError('A poll must have between 2 and 10 options', 'INVALID_OPTIONS_COUNT');
    }

    for (const opt of formattedOptions) {
      if (!opt.text) {
        throw new BadRequestError('All options must have non-empty text', 'EMPTY_OPTION');
      }
    }

    // Normalize eligibility
    const elType = eligibility?.type || 'any';
    const normalizedEligibility = {
      type: elType,
      domain: null,
      allowedEmails: [],
    };

    if (elType === 'domain') {
      if (!eligibility.domain || !eligibility.domain.trim()) {
        throw new BadRequestError('Domain is required for domain eligibility', 'INVALID_ELIGIBILITY');
      }
      normalizedEligibility.domain = eligibility.domain.trim().toLowerCase().replace(/^@/, '');
    } else if (elType === 'invite') {
      if (!Array.isArray(eligibility.allowedEmails) || eligibility.allowedEmails.length === 0) {
        throw new BadRequestError('At least one email is required for invite eligibility', 'INVALID_ELIGIBILITY');
      }
      normalizedEligibility.allowedEmails = eligibility.allowedEmails
        .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter(Boolean);
    }

    const poll = await Poll.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      options: formattedOptions,
      closesAt: closesAtDate,
      eligibility: normalizedEligibility,
      createdBy: req.user._id,
    });

    res.status(201).json({
      poll: {
        id: poll._id,
        title: poll.title,
        description: poll.description,
        options: poll.options,
        closesAt: poll.closesAt,
        eligibility: poll.eligibility,
        createdBy: poll.createdBy,
        createdAt: poll.createdAt,
        status: poll.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getPolls = async (req, res, next) => {
  try {
    const { status } = req.query;
    const now = new Date();
    let query = {};

    if (status === 'open') {
      query.closesAt = { $gt: now };
    } else if (status === 'closed') {
      query.closesAt = { $lte: now };
    }

    const polls = await Poll.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const sanitizedPolls = polls.map((p) => ({
      id: p._id,
      title: p.title,
      description: p.description,
      optionsCount: p.options.length,
      closesAt: p.closesAt,
      eligibility: p.eligibility,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      status: p.status,
    }));

    res.status(200).json({ polls: sanitizedPolls });
  } catch (err) {
    next(err);
  }
};

const getMyPolls = async (req, res, next) => {
  try {
    const polls = await Poll.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });

    const sanitizedPolls = polls.map((p) => ({
      id: p._id,
      title: p.title,
      description: p.description,
      optionsCount: p.options.length,
      closesAt: p.closesAt,
      eligibility: p.eligibility,
      createdAt: p.createdAt,
      status: p.status,
    }));

    res.status(200).json({ polls: sanitizedPolls });
  } catch (err) {
    next(err);
  }
};

const getPollById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const poll = await Poll.findById(id).populate('createdBy', 'name email');

    if (!poll) {
      throw new NotFoundError('Poll not found', 'POLL_NOT_FOUND');
    }

    const vote = await Vote.findOne({ pollId: poll._id, userId: req.user._id });
    const hasVoted = Boolean(vote);
    const eligibilityResult = checkUserEligibility(req.user, poll.eligibility);

    res.status(200).json({
      poll: {
        id: poll._id,
        title: poll.title,
        description: poll.description,
        options: poll.options.map((opt) => ({
          id: opt._id,
          text: opt.text,
        })),
        closesAt: poll.closesAt,
        eligibility: poll.eligibility,
        createdBy: poll.createdBy,
        createdAt: poll.createdAt,
        status: poll.status,
        hasVoted,
        votedOptionId: hasVoted ? vote.optionId : null,
        isEligible: eligibilityResult.isEligible,
        ineligibleReason: eligibilityResult.reason,
      },
    });
  } catch (err) {
    next(err);
  }
};

const votePoll = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { optionId } = req.body;

    const poll = await Poll.findById(id);
    if (!poll) {
      throw new NotFoundError('Poll not found', 'POLL_NOT_FOUND');
    }

    // 1. Time check (strict server time)
    if (new Date() >= poll.closesAt) {
      throw new BadRequestError('Poll is closed for voting', 'POLL_CLOSED');
    }

    // 2. Validate optionId belongs to the poll
    const optionExists = poll.options.some((opt) => opt._id.toString() === optionId.toString());
    if (!optionExists) {
      throw new BadRequestError('Option does not belong to this poll', 'INVALID_OPTION');
    }

    // 3. Check user eligibility
    const eligibilityResult = checkUserEligibility(req.user, poll.eligibility);
    if (!eligibilityResult.isEligible) {
      throw new ForbiddenError(
        eligibilityResult.reason || 'You are not eligible to vote in this poll',
        'INELIGIBLE_USER'
      );
    }

    // 4. Create vote
    const vote = await Vote.create({
      pollId: poll._id,
      userId: req.user._id,
      optionId,
    });

    res.status(201).json({
      message: 'Vote recorded successfully',
      voteId: vote._id,
    });
  } catch (err) {
    next(err);
  }
};

const getPollResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const poll = await Poll.findById(id).populate('createdBy', 'name email');

    if (!poll) {
      throw new NotFoundError('Poll not found', 'POLL_NOT_FOUND');
    }

    // RESULTS LOCK: Check server time vs closesAt
    if (new Date() < poll.closesAt) {
      throw new ForbiddenError(
        'Results are locked until the poll has closed',
        'RESULTS_LOCKED'
      );
    }

    // Poll is closed: fetch all votes and calculate results
    const votes = await Vote.find({ pollId: poll._id });
    const results = calculateResults(poll.options, votes);

    res.status(200).json({
      poll: {
        id: poll._id,
        title: poll.title,
        description: poll.description,
        closesAt: poll.closesAt,
        status: 'closed',
        totalVotes: results.totalVotes,
        options: results.options,
        winners: results.winners,
      },
    });
  } catch (err) {
    next(err);
  }
};

const closePoll = async (req, res, next) => {
  try {
    const { id } = req.params;
    const poll = await Poll.findById(id);

    if (!poll) {
      throw new NotFoundError('Poll not found', 'POLL_NOT_FOUND');
    }

    const userId = req.user._id ? req.user._id.toString() : req.user.id?.toString();
    if (poll.createdBy.toString() !== userId) {
      throw new ForbiddenError('Only the creator can end this poll', 'NOT_POLL_CREATOR');
    }

    poll.closesAt = new Date();
    await poll.save();

    res.status(200).json({
      message: 'Poll ended successfully',
      poll: {
        id: poll._id,
        title: poll.title,
        status: 'closed',
        closesAt: poll.closesAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPoll,
  getPolls,
  getMyPolls,
  getPollById,
  votePoll,
  getPollResults,
  closePoll,
};
