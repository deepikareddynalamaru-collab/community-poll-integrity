const request = require('supertest');
const app = require('../src/app');
const Poll = require('../src/models/Poll');
const Vote = require('../src/models/Vote');
const User = require('../src/models/User');

describe('Milestone 4: Results Endpoint & Mathematical Verification', () => {
  let userToken;
  let user;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Organizer',
      email: 'organizer@club.org',
      password: 'password123',
    });
    userToken = res.body.token;
    user = res.body.user;
  });

  describe('GET /api/polls/:id/results (Locking on Open Polls)', () => {
    it('should return 403 Forbidden on an open poll with code RESULTS_LOCKED and no count data', async () => {
      const openPoll = await Poll.create({
        title: 'Active Election',
        options: [{ text: 'Candidate A' }, { text: 'Candidate B' }],
        closesAt: new Date(Date.now() + 1000 * 60 * 60), // +1 hour
        createdBy: user.id,
      });

      // Vote once
      await Vote.create({
        pollId: openPoll._id,
        userId: user.id,
        optionId: openPoll.options[0]._id,
      });

      const res = await request(app)
        .get(`/api/polls/${openPoll._id}/results`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('RESULTS_LOCKED');
      expect(res.body.error.message).toContain('locked');

      // Crucial: absolutely no leak of vote count
      expect(res.body.totalVotes).toBeUndefined();
      expect(res.body.options).toBeUndefined();
      expect(res.body.winners).toBeUndefined();
    });
  });

  describe('GET /api/polls/:id/results (Closed Poll Results & Math)', () => {
    it('should return 200 with zero votes when no votes were cast', async () => {
      const emptyClosedPoll = await Poll.create({
        title: 'Empty Poll',
        options: [{ text: 'Opt 1' }, { text: 'Opt 2' }],
        closesAt: new Date(Date.now() - 1000 * 60),
        createdBy: user.id,
      });

      const res = await request(app)
        .get(`/api/polls/${emptyClosedPoll._id}/results`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.poll.totalVotes).toBe(0);
      expect(res.body.poll.options[0].count).toBe(0);
      expect(res.body.poll.options[0].percentage).toBe(0);
      expect(res.body.poll.winners).toEqual([]);
    });

    it('should return correct counts, determine single winner, and guarantee percentages sum to 100', async () => {
      const closedPoll = await Poll.create({
        title: 'Ended Poll',
        options: [{ text: 'Option Alpha' }, { text: 'Option Beta' }, { text: 'Option Gamma' }],
        closesAt: new Date(Date.now() - 1000 * 60),
        createdBy: user.id,
      });

      const optA = closedPoll.options[0]._id;
      const optB = closedPoll.options[1]._id;
      const optC = closedPoll.options[2]._id;

      // Create 7 votes (3 for A, 2 for B, 2 for C)
      // Exact percentages: 3/7 = 42.857%, 2/7 = 28.571%, 2/7 = 28.571%
      // With Largest Remainder Method: 43%, 29%, 28% -> Sum = 100!
      const voterIds = [];
      for (let i = 0; i < 7; i++) {
        const u = await User.create({
          name: `Voter ${i}`,
          email: `voter${i}@example.com`,
          passwordHash: 'hash',
        });
        voterIds.push(u._id);
      }

      await Vote.create({ pollId: closedPoll._id, userId: voterIds[0], optionId: optA });
      await Vote.create({ pollId: closedPoll._id, userId: voterIds[1], optionId: optA });
      await Vote.create({ pollId: closedPoll._id, userId: voterIds[2], optionId: optA });
      await Vote.create({ pollId: closedPoll._id, userId: voterIds[3], optionId: optB });
      await Vote.create({ pollId: closedPoll._id, userId: voterIds[4], optionId: optB });
      await Vote.create({ pollId: closedPoll._id, userId: voterIds[5], optionId: optC });
      await Vote.create({ pollId: closedPoll._id, userId: voterIds[6], optionId: optC });

      const res = await request(app)
        .get(`/api/polls/${closedPoll._id}/results`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const poll = res.body.poll;
      expect(poll.totalVotes).toBe(7);

      const optionAData = poll.options.find((o) => o.id === optA.toString());
      const optionBData = poll.options.find((o) => o.id === optB.toString());
      const optionCData = poll.options.find((o) => o.id === optC.toString());

      expect(optionAData.count).toBe(3);
      expect(optionBData.count).toBe(2);
      expect(optionCData.count).toBe(2);

      // Verify percentages sum to exactly 100
      const totalPercentage = poll.options.reduce((sum, opt) => sum + opt.percentage, 0);
      expect(totalPercentage).toBe(100);

      // Winner should be Option Alpha
      expect(poll.winners).toHaveLength(1);
      expect(poll.winners[0].id).toBe(optA.toString());
      expect(poll.winners[0].text).toBe('Option Alpha');
      expect(poll.winners[0].count).toBe(3);
    });

    it('should correctly handle multi-way ties in winners', async () => {
      const closedPoll = await Poll.create({
        title: 'Tied Election',
        options: [{ text: 'Team Red' }, { text: 'Team Blue' }],
        closesAt: new Date(Date.now() - 1000 * 60),
        createdBy: user.id,
      });

      const optRed = closedPoll.options[0]._id;
      const optBlue = closedPoll.options[1]._id;

      const user1 = await User.create({ name: 'V1', email: 'v1@test.com', passwordHash: 'h' });
      const user2 = await User.create({ name: 'V2', email: 'v2@test.com', passwordHash: 'h' });

      await Vote.create({ pollId: closedPoll._id, userId: user1._id, optionId: optRed });
      await Vote.create({ pollId: closedPoll._id, userId: user2._id, optionId: optBlue });

      const res = await request(app)
        .get(`/api/polls/${closedPoll._id}/results`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.poll.totalVotes).toBe(2);
      expect(res.body.poll.winners).toHaveLength(2);
      expect(res.body.poll.winners.map((w) => w.text)).toEqual(
        expect.arrayContaining(['Team Red', 'Team Blue'])
      );
    });
  });
});

