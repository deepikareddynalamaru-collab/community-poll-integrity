const request = require('supertest');
const app = require('../src/app');
const Poll = require('../src/models/Poll');
const Vote = require('../src/models/Vote');

describe('Milestone 3: Voting with Unique Compound Index & Closure Checks', () => {
  let userToken;
  let user;
  let otherToken;
  let otherUser;
  let openPoll;
  let closedPoll;

  beforeEach(async () => {
    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Alice Member',
      email: 'alice@club.org',
      password: 'password123',
    });
    userToken = resA.body.token;
    user = resA.body.user;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Bob Outside',
      email: 'bob@other.com',
      password: 'password123',
    });
    otherToken = resB.body.token;
    otherUser = resB.body.user;

    // Create an open poll
    openPoll = await Poll.create({
      title: 'Club Mascot Election',
      options: [{ text: 'Otters' }, { text: 'Badgers' }, { text: 'Falcons' }],
      closesAt: new Date(Date.now() + 1000 * 60 * 60), // +1 hour
      eligibility: { type: 'any' },
      createdBy: user.id,
    });

    // Create a closed poll
    closedPoll = await Poll.create({
      title: 'Past Event Vote',
      options: [{ text: 'Yes' }, { text: 'No' }],
      closesAt: new Date(Date.now() - 1000 * 60), // -1 minute
      eligibility: { type: 'any' },
      createdBy: user.id,
    });
  });

  it('should allow an eligible user to vote on an open poll', async () => {
    const optionId = openPoll.options[0]._id.toString();

    const res = await request(app)
      .post(`/api/polls/${openPoll._id}/vote`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ optionId });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Vote recorded successfully');

    // Verify exactly one vote exists in database
    const votes = await Vote.find({ pollId: openPoll._id });
    expect(votes).toHaveLength(1);
    expect(votes[0].userId.toString()).toBe(user.id);
    expect(votes[0].optionId.toString()).toBe(optionId);
  });

  it('should return 409 and maintain exactly one Vote document when voting twice sequentially', async () => {
    const option1 = openPoll.options[0]._id.toString();
    const option2 = openPoll.options[1]._id.toString();

    // First vote
    const firstVoteRes = await request(app)
      .post(`/api/polls/${openPoll._id}/vote`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ optionId: option1 });

    expect(firstVoteRes.status).toBe(201);

    // Second vote attempt (even for a different option)
    const secondVoteRes = await request(app)
      .post(`/api/polls/${openPoll._id}/vote`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ optionId: option2 });

    expect(secondVoteRes.status).toBe(409);
    expect(secondVoteRes.body.error).toBeDefined();
    expect(secondVoteRes.body.error.code).toBe('DUPLICATE_VOTE');
    expect(secondVoteRes.body.error.message).toContain('already voted');

    // Verify DB still contains exactly one vote
    const votesInDb = await Vote.find({ pollId: openPoll._id, userId: user.id });
    expect(votesInDb).toHaveLength(1);
    expect(votesInDb[0].optionId.toString()).toBe(option1);
  });

  it('should handle two simultaneous vote requests from one user resulting in exactly one stored vote', async () => {
    const option1 = openPoll.options[0]._id.toString();
    const option2 = openPoll.options[1]._id.toString();

    // Fire two concurrent vote requests simultaneously
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/polls/${openPoll._id}/vote`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ optionId: option1 }),
      request(app)
        .post(`/api/polls/${openPoll._id}/vote`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ optionId: option2 }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One must succeed (201) and the duplicate must be rejected by unique index (409)
    expect(statuses).toEqual([201, 409]);

    // Verify exactly one vote exists in DB
    const votesInDb = await Vote.find({ pollId: openPoll._id, userId: user.id });
    expect(votesInDb).toHaveLength(1);
  });

  it('should reject a vote after closesAt with 400 and POLL_CLOSED code', async () => {
    const optionId = closedPoll.options[0]._id.toString();

    const res = await request(app)
      .post(`/api/polls/${closedPoll._id}/vote`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ optionId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('POLL_CLOSED');
    expect(res.body.error.message).toContain('closed');

    // Verify no vote saved
    const count = await Vote.countDocuments({ pollId: closedPoll._id });
    expect(count).toBe(0);
  });

  it('should reject a vote with an invalid optionId with 400', async () => {
    // Option from another poll
    const fakeOptionId = closedPoll.options[0]._id.toString();

    const res = await request(app)
      .post(`/api/polls/${openPoll._id}/vote`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ optionId: fakeOptionId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OPTION');
  });

  it('should reject an ineligible user with 403 on domain-restricted poll', async () => {
    const domainPoll = await Poll.create({
      title: 'Club Members Only',
      options: [{ text: 'Yes' }, { text: 'No' }],
      closesAt: new Date(Date.now() + 100000),
      eligibility: { type: 'domain', domain: 'club.org' },
      createdBy: user.id,
    });

    const optionId = domainPoll.options[0]._id.toString();

    // Bob has bob@other.com -> not eligible
    const resBob = await request(app)
      .post(`/api/polls/${domainPoll._id}/vote`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ optionId });

    expect(resBob.status).toBe(403);
    expect(resBob.body.error.code).toBe('INELIGIBLE_USER');
    expect(resBob.body.error.message).toContain('@club.org');

    // Alice has alice@club.org -> eligible
    const resAlice = await request(app)
      .post(`/api/polls/${domainPoll._id}/vote`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ optionId });

    expect(resAlice.status).toBe(201);
  });

  it('should reject an ineligible user with 403 on invite-only poll', async () => {
    const invitePoll = await Poll.create({
      title: 'Board of Directors Vote',
      options: [{ text: 'Approve' }, { text: 'Reject' }],
      closesAt: new Date(Date.now() + 100000),
      eligibility: {
        type: 'invite',
        allowedEmails: ['alice@club.org'],
      },
      createdBy: user.id,
    });

    const optionId = invitePoll.options[0]._id.toString();

    // Bob is not on the invited list
    const resBob = await request(app)
      .post(`/api/polls/${invitePoll._id}/vote`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ optionId });

    expect(resBob.status).toBe(403);
    expect(resBob.body.error.code).toBe('INELIGIBLE_USER');
    expect(resBob.body.error.message).toContain('invited voter list');

    // Alice is on the invited list
    const resAlice = await request(app)
      .post(`/api/polls/${invitePoll._id}/vote`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ optionId });

    expect(resAlice.status).toBe(201);
  });
});

