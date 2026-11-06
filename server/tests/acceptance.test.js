const request = require('supertest');
const app = require('../src/app');
const Poll = require('../src/models/Poll');
const Vote = require('../src/models/Vote');
const User = require('../src/models/User');

describe('PRD Acceptance Criteria Full Verification', () => {
  let userA, tokenA;
  let userB, tokenB;

  beforeEach(async () => {
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Voter Alpha',
      email: 'alpha@domain.org',
      password: 'password123',
    });
    tokenA = resA.body.token;
    userA = resA.body.user;

    const resB = await request(app).post('/api/auth/register').send({
      name: 'Voter Beta',
      email: 'beta@other.com',
      password: 'password123',
    });
    tokenB = resB.body.token;
    userB = resB.body.user;
  });

  // Acceptance Criterion 1
  test('AC 1: Voting twice as the same user returns 409 and exactly one Vote document exists', async () => {
    const poll = await Poll.create({
      title: 'AC1 Poll',
      options: [{ text: 'Choice 1' }, { text: 'Choice 2' }],
      closesAt: new Date(Date.now() + 1000 * 60 * 60),
      createdBy: userA.id,
    });

    const opt1 = poll.options[0]._id.toString();
    const opt2 = poll.options[1]._id.toString();

    // First vote -> 201
    const res1 = await request(app)
      .post(`/api/polls/${poll._id}/vote`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ optionId: opt1 });
    expect(res1.status).toBe(201);

    // Second vote -> 409
    const res2 = await request(app)
      .post(`/api/polls/${poll._id}/vote`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ optionId: opt2 });
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('DUPLICATE_VOTE');

    // Exactly one Vote document exists
    const storedVotes = await Vote.find({ pollId: poll._id, userId: userA.id });
    expect(storedVotes).toHaveLength(1);
    expect(storedVotes[0].optionId.toString()).toBe(opt1);
  });

  // Acceptance Criterion 2
  test('AC 2: Two simultaneous vote requests from one user result in exactly one stored vote', async () => {
    const poll = await Poll.create({
      title: 'AC2 Race Condition Poll',
      options: [{ text: 'Race A' }, { text: 'Race B' }],
      closesAt: new Date(Date.now() + 1000 * 60 * 60),
      createdBy: userA.id,
    });

    const opt1 = poll.options[0]._id.toString();
    const opt2 = poll.options[1]._id.toString();

    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ optionId: opt1 }),
      request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ optionId: opt2 }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const storedVotes = await Vote.find({ pollId: poll._id, userId: userA.id });
    expect(storedVotes).toHaveLength(1);
  });

  // Acceptance Criterion 3
  test('AC 3: GET /results on an open poll returns 403 with no count data', async () => {
    const poll = await Poll.create({
      title: 'AC3 Open Poll',
      options: [{ text: 'Hidden 1' }, { text: 'Hidden 2' }],
      closesAt: new Date(Date.now() + 1000 * 60 * 60),
      createdBy: userA.id,
    });

    // Cast a vote to verify it is not leaked
    await Vote.create({
      pollId: poll._id,
      userId: userA.id,
      optionId: poll.options[0]._id,
    });

    const res = await request(app)
      .get(`/api/polls/${poll._id}/results`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('RESULTS_LOCKED');
    expect(res.body.totalVotes).toBeUndefined();
    expect(res.body.options).toBeUndefined();
    expect(res.body.poll).toBeUndefined();
  });

  // Acceptance Criterion 4
  test('AC 4: Poll list/detail/mine responses contain no vote counts', async () => {
    const poll = await Poll.create({
      title: 'AC4 Count Leaking Test',
      options: [{ text: 'Opt A' }, { text: 'Opt B' }],
      closesAt: new Date(Date.now() + 1000 * 60 * 60),
      createdBy: userA.id,
    });

    // Cast a vote
    await Vote.create({
      pollId: poll._id,
      userId: userA.id,
      optionId: poll.options[0]._id,
    });

    // 1. Check GET /api/polls
    const listRes = await request(app)
      .get('/api/polls')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listRes.status).toBe(200);
    for (const p of listRes.body.polls) {
      expect(p.votes).toBeUndefined();
      expect(p.totalVotes).toBeUndefined();
      expect(p.voteCount).toBeUndefined();
      expect(p.turnout).toBeUndefined();
    }

    // 2. Check GET /api/polls/mine
    const mineRes = await request(app)
      .get('/api/polls/mine')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(mineRes.status).toBe(200);
    for (const p of mineRes.body.polls) {
      expect(p.votes).toBeUndefined();
      expect(p.totalVotes).toBeUndefined();
      expect(p.voteCount).toBeUndefined();
    }

    // 3. Check GET /api/polls/:id
    const detailRes = await request(app)
      .get(`/api/polls/${poll._id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(detailRes.status).toBe(200);
    const d = detailRes.body.poll;
    expect(d.votes).toBeUndefined();
    expect(d.totalVotes).toBeUndefined();
    expect(d.voteCount).toBeUndefined();
    for (const opt of d.options) {
      expect(opt.count).toBeUndefined();
      expect(opt.votes).toBeUndefined();
      expect(opt.percentage).toBeUndefined();
    }
  });

  // Acceptance Criterion 5
  test('AC 5: A vote after closesAt is rejected with 400', async () => {
    const expiredPoll = await Poll.create({
      title: 'AC5 Expired Poll',
      options: [{ text: 'Late 1' }, { text: 'Late 2' }],
      closesAt: new Date(Date.now() - 1000 * 30), // Closed 30 seconds ago
      createdBy: userA.id,
    });

    const res = await request(app)
      .post(`/api/polls/${expiredPoll._id}/vote`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ optionId: expiredPoll.options[0]._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('POLL_CLOSED');
    expect(res.body.error.message).toContain('closed');

    const votes = await Vote.find({ pollId: expiredPoll._id });
    expect(votes).toHaveLength(0);
  });

  // Acceptance Criterion 6
  test('AC 6: An ineligible user is blocked with 403 and a clear reason', async () => {
    // 6a: Domain restricted
    const domainPoll = await Poll.create({
      title: 'AC6 Domain Poll',
      options: [{ text: 'A' }, { text: 'B' }],
      closesAt: new Date(Date.now() + 1000 * 60),
      eligibility: { type: 'domain', domain: 'domain.org' },
      createdBy: userA.id,
    });

    // Beta has beta@other.com -> blocked
    const resDomain = await request(app)
      .post(`/api/polls/${domainPoll._id}/vote`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ optionId: domainPoll.options[0]._id.toString() });

    expect(resDomain.status).toBe(403);
    expect(resDomain.body.error.code).toBe('INELIGIBLE_USER');
    expect(resDomain.body.error.message).toContain('@domain.org');

    // 6b: Invite list restricted
    const invitePoll = await Poll.create({
      title: 'AC6 Invite Poll',
      options: [{ text: 'A' }, { text: 'B' }],
      closesAt: new Date(Date.now() + 1000 * 60),
      eligibility: { type: 'invite', allowedEmails: ['alpha@domain.org'] },
      createdBy: userA.id,
    });

    // Beta is not in allowedEmails -> blocked
    const resInvite = await request(app)
      .post(`/api/polls/${invitePoll._id}/vote`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ optionId: invitePoll.options[0]._id.toString() });

    expect(resInvite.status).toBe(403);
    expect(resInvite.body.error.code).toBe('INELIGIBLE_USER');
    expect(resInvite.body.error.message).toContain('invited voter list');
  });

  // Acceptance Criterion 7
  test('AC 7: After closure, counts are correct and percentages sum to 100', async () => {
    const closedPoll = await Poll.create({
      title: 'AC7 Final Poll',
      options: [{ text: 'Candidate 1' }, { text: 'Candidate 2' }, { text: 'Candidate 3' }],
      closesAt: new Date(Date.now() - 1000 * 10),
      createdBy: userA.id,
    });

    const opt1 = closedPoll.options[0]._id;
    const opt2 = closedPoll.options[1]._id;
    const opt3 = closedPoll.options[2]._id;

    // Simulate 10 votes (5 for opt1, 3 for opt2, 2 for opt3)
    // 5/10 = 50%, 3/10 = 30%, 2/10 = 20% -> Sum = 100%
    for (let i = 0; i < 10; i++) {
      const u = await User.create({
        name: `Voter ${i}`,
        email: `voter_${i}_${Date.now()}@test.org`,
        passwordHash: 'hash',
      });
      const chosenOpt = i < 5 ? opt1 : i < 8 ? opt2 : opt3;
      await Vote.create({
        pollId: closedPoll._id,
        userId: u._id,
        optionId: chosenOpt,
      });
    }

    const res = await request(app)
      .get(`/api/polls/${closedPoll._id}/results`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const p = res.body.poll;
    expect(p.totalVotes).toBe(10);

    const opt1Data = p.options.find((o) => o.id === opt1.toString());
    const opt2Data = p.options.find((o) => o.id === opt2.toString());
    const opt3Data = p.options.find((o) => o.id === opt3.toString());

    expect(opt1Data.count).toBe(5);
    expect(opt2Data.count).toBe(3);
    expect(opt3Data.count).toBe(2);

    const sumPct = p.options.reduce((sum, o) => sum + o.percentage, 0);
    expect(sumPct).toBe(100);

    expect(p.winners).toHaveLength(1);
    expect(p.winners[0].id).toBe(opt1.toString());
    expect(p.winners[0].text).toBe('Candidate 1');
  });
});

