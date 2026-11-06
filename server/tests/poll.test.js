const request = require('supertest');
const app = require('../src/app');
const Poll = require('../src/models/Poll');

describe('Milestone 2: Poll Creation, Listing, Detail & Eligibility Logic', () => {
  let userToken;
  let user;
  let otherToken;
  let otherUser;

  beforeEach(async () => {
    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Alice Member',
      email: 'alice@community.org',
      password: 'password123',
    });
    userToken = resA.body.token;
    user = resA.body.user;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Bob Outside',
      email: 'bob@gmail.com',
      password: 'password123',
    });
    otherToken = resB.body.token;
    otherUser = resB.body.user;
  });

  describe('POST /api/polls (Creation)', () => {
    it('should create a poll successfully and compute status as open', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Annual Officer Election',
          description: 'Vote for the new president',
          options: ['Option Alice', 'Option Bob'],
          closesAt: futureDate,
          eligibility: { type: 'any' },
        });

      expect(res.status).toBe(201);
      expect(res.body.poll).toBeDefined();
      expect(res.body.poll.title).toBe('Annual Officer Election');
      expect(res.body.poll.options).toHaveLength(2);
      expect(res.body.poll.options[0]).toHaveProperty('_id');
      expect(res.body.poll.options[0].text).toBe('Option Alice');
      expect(res.body.poll.status).toBe('open');

      // Crucial: No vote count fields!
      expect(res.body.poll.votes).toBeUndefined();
      expect(res.body.poll.voteCount).toBeUndefined();
      expect(res.body.poll.options[0].votes).toBeUndefined();
    });

    it('should reject poll creation if closesAt is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60).toISOString();
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Past Poll',
          options: ['Yes', 'No'],
          closesAt: pastDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CLOSING_TIME');
    });

    it('should reject poll with less than 2 options', async () => {
      const futureDate = new Date(Date.now() + 100000).toISOString();
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Only One Option Poll',
          options: ['Just Me'],
          closesAt: futureDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject poll with more than 10 options', async () => {
      const futureDate = new Date(Date.now() + 100000).toISOString();
      const options = Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`);
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Too Many Options Poll',
          options,
          closesAt: futureDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject domain eligibility when domain is missing', async () => {
      const futureDate = new Date(Date.now() + 100000).toISOString();
      const res = await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Domain Poll',
          options: ['Option A', 'Option B'],
          closesAt: futureDate,
          eligibility: { type: 'domain', domain: '' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ELIGIBILITY');
    });

    it('should reject unauthenticated request with 401', async () => {
      const futureDate = new Date(Date.now() + 100000).toISOString();
      const res = await request(app)
        .post('/api/polls')
        .send({
          title: 'Unauth Poll',
          options: ['A', 'B'],
          closesAt: futureDate,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('Route Ordering: GET /api/polls/mine vs GET /api/polls/:id', () => {
    it('should successfully call /api/polls/mine without route conflict with :id', async () => {
      // Create a poll first
      const futureDate = new Date(Date.now() + 100000).toISOString();
      await request(app)
        .post('/api/polls')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'My Custom Poll',
          options: ['Alpha', 'Beta'],
          closesAt: futureDate,
        });

      const res = await request(app)
        .get('/api/polls/mine')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('polls');
      expect(res.body.polls.length).toBe(1);
      expect(res.body.polls[0].title).toBe('My Custom Poll');

      // Bob's /mine should be empty
      const resBob = await request(app)
        .get('/api/polls/mine')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(resBob.status).toBe(200);
      expect(resBob.body.polls.length).toBe(0);
    });
  });

  describe('GET /api/polls (Listing & Status Filtering)', () => {
    beforeEach(async () => {
      // Create an open poll
      await Poll.create({
        title: 'Open Poll 1',
        options: [{ text: 'Yes' }, { text: 'No' }],
        closesAt: new Date(Date.now() + 1000 * 60 * 60), // +1 hour
        createdBy: user.id,
      });

      // Create a closed poll directly
      await Poll.create({
        title: 'Closed Poll 1',
        options: [{ text: 'Cats' }, { text: 'Dogs' }],
        closesAt: new Date(Date.now() - 1000 * 60 * 60), // -1 hour
        createdBy: user.id,
      });
    });

    it('should list all polls and compute dynamic status without leaking vote counts', async () => {
      const res = await request(app)
        .get('/api/polls')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.polls).toHaveLength(2);

      const openPoll = res.body.polls.find((p) => p.title === 'Open Poll 1');
      const closedPoll = res.body.polls.find((p) => p.title === 'Closed Poll 1');

      expect(openPoll.status).toBe('open');
      expect(closedPoll.status).toBe('closed');

      // Ensure no vote counts are leaked anywhere in list
      for (const p of res.body.polls) {
        expect(p.votes).toBeUndefined();
        expect(p.totalVotes).toBeUndefined();
        expect(p.voteCount).toBeUndefined();
      }
    });

    it('should filter by ?status=open', async () => {
      const res = await request(app)
        .get('/api/polls?status=open')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.polls).toHaveLength(1);
      expect(res.body.polls[0].title).toBe('Open Poll 1');
      expect(res.body.polls[0].status).toBe('open');
    });

    it('should filter by ?status=closed', async () => {
      const res = await request(app)
        .get('/api/polls?status=closed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.polls).toHaveLength(1);
      expect(res.body.polls[0].title).toBe('Closed Poll 1');
      expect(res.body.polls[0].status).toBe('closed');
    });
  });

  describe('GET /api/polls/:id (Detail & Eligibility Check)', () => {
    it('should return poll detail with isEligible=true for type="any"', async () => {
      const poll = await Poll.create({
        title: 'General Election',
        options: [{ text: 'Candidate 1' }, { text: 'Candidate 2' }],
        closesAt: new Date(Date.now() + 100000),
        eligibility: { type: 'any' },
        createdBy: user.id,
      });

      const res = await request(app)
        .get(`/api/polls/${poll._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.poll).toBeDefined();
      expect(res.body.poll.title).toBe('General Election');
      expect(res.body.poll.hasVoted).toBe(false);
      expect(res.body.poll.isEligible).toBe(true);
      expect(res.body.poll.ineligibleReason).toBeNull();
      expect(res.body.poll.status).toBe('open');

      // Crucial: No vote counts
      expect(res.body.poll.totalVotes).toBeUndefined();
      expect(res.body.poll.options[0].count).toBeUndefined();
    });

    it('should correctly evaluate domain eligibility', async () => {
      const poll = await Poll.create({
        title: 'Community Organization Only',
        options: [{ text: 'Approve' }, { text: 'Reject' }],
        closesAt: new Date(Date.now() + 100000),
        eligibility: { type: 'domain', domain: 'community.org' },
        createdBy: user.id,
      });

      // Alice has email alice@community.org -> eligible
      const resAlice = await request(app)
        .get(`/api/polls/${poll._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(resAlice.status).toBe(200);
      expect(resAlice.body.poll.isEligible).toBe(true);
      expect(resAlice.body.poll.ineligibleReason).toBeNull();

      // Bob has email bob@gmail.com -> ineligible
      const resBob = await request(app)
        .get(`/api/polls/${poll._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(resBob.status).toBe(200);
      expect(resBob.body.poll.isEligible).toBe(false);
      expect(resBob.body.poll.ineligibleReason).toContain('@community.org');
    });

    it('should correctly evaluate invite-list eligibility', async () => {
      const poll = await Poll.create({
        title: 'Exclusive Committee Poll',
        options: [{ text: 'Motion A' }, { text: 'Motion B' }],
        closesAt: new Date(Date.now() + 100000),
        eligibility: {
          type: 'invite',
          allowedEmails: ['alice@community.org', 'carol@committee.org'],
        },
        createdBy: user.id,
      });

      // Alice is on the invite list
      const resAlice = await request(app)
        .get(`/api/polls/${poll._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(resAlice.body.poll.isEligible).toBe(true);

      // Bob is NOT on the invite list
      const resBob = await request(app)
        .get(`/api/polls/${poll._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(resBob.body.poll.isEligible).toBe(false);
      expect(resBob.body.poll.ineligibleReason).toContain('invited voter list');
    });

    it('should return 400 for invalid ObjectId param', async () => {
      const res = await request(app)
        .get('/api/polls/invalid-id-123')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent poll', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/polls/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('POLL_NOT_FOUND');
    });
  });
});

