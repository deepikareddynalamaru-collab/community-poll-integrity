const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/poll_integrity';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    }

    console.log('Seeding initial demo data...');

    // 1. Create demo users
    const passwordHash = await bcrypt.hash('password123', 10);

    const users = [
      { name: 'Alice Admin', email: 'alice@community.org', passwordHash },
      { name: 'Bob Member', email: 'bob@community.org', passwordHash },
      { name: 'Carol Guest', email: 'carol@gmail.com', passwordHash },
      { name: 'David Scholar', email: 'david@school.edu', passwordHash },
    ];

    const createdUsers = [];
    for (const u of users) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        existing = await User.create(u);
      }
      createdUsers.push(existing);
    }

    const [alice, bob, carol, david] = createdUsers;

    // 2. Active Poll: Open to all members
    const openPoll1 = await Poll.create({
      title: '2026 Community Budget Priorities',
      description: 'Cast your vote for which public works project should receive surplus funding this fiscal year.',
      options: [
        { text: 'Parks & Urban Greenery Expansion' },
        { text: 'Digital Library & Maker Space' },
        { text: 'Youth Sports Complex' },
        { text: 'Protected Bicycle Transit Network' },
      ],
      closesAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // +48 hours
      eligibility: { type: 'any' },
      createdBy: alice._id,
    });

    // 3. Active Poll: Restricted by domain (@community.org)
    const domainPoll = await Poll.create({
      title: 'Internal Governance Policy Amendment',
      description: 'Official vote for verified community members with @community.org email addresses.',
      options: [
        { text: 'Approve Proposed Bylaw Changes' },
        { text: 'Reject Proposed Bylaw Changes' },
        { text: 'Request Further Committee Review' },
      ],
      closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 hours
      eligibility: { type: 'domain', domain: 'community.org' },
      createdBy: alice._id,
    });

    // 4. Active Poll: Invite-Only
    const invitePoll = await Poll.create({
      title: 'Board Committee Executive Appointment',
      description: 'Closed ballot for designated committee delegates.',
      options: [
        { text: 'Nominee Sarah Jenkins' },
        { text: 'Nominee Marcus Vance' },
      ],
      closesAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // +12 hours
      eligibility: {
        type: 'invite',
        allowedEmails: ['alice@community.org', 'bob@community.org'],
      },
      createdBy: alice._id,
    });

    // 5. Closed Poll with Votes (Ready for immediate Results inspection)
    const closedPoll = await Poll.create({
      title: 'Annual Community Festival Theme (Concluded)',
      description: 'The community voted on the main theme for the upcoming summer celebration.',
      options: [
        { text: 'Retro 80s Neon Arcade' },
        { text: 'Harvest Solstice & Local Arts' },
        { text: 'Futuristic Sci-Fi Expo' },
        { text: 'Under the Sea Carnival' },
      ],
      closesAt: new Date(Date.now() - 3600 * 1000), // Closed 1 hour ago
      eligibility: { type: 'any' },
      createdBy: alice._id,
    });

    // Cast demo votes for the closed poll to demonstrate Hare-Niemeyer math & winner highlight
    const optRetro = closedPoll.options[0]._id;
    const optHarvest = closedPoll.options[1]._id;
    const optSciFi = closedPoll.options[2]._id;
    const optSea = closedPoll.options[3]._id;

    // Alice, Bob, Carol, David vote
    await Vote.create({ pollId: closedPoll._id, userId: alice._id, optionId: optRetro });
    await Vote.create({ pollId: closedPoll._id, userId: bob._id, optionId: optRetro });
    await Vote.create({ pollId: closedPoll._id, userId: carol._id, optionId: optHarvest });
    await Vote.create({ pollId: closedPoll._id, userId: david._id, optionId: optRetro });

    // Additional mock votes from extra dummy users
    for (let i = 1; i <= 9; i++) {
      const dummy = await User.create({
        name: `Voter ${i}`,
        email: `dummy_${i}_${Date.now()}@example.com`,
        passwordHash,
      });
      const chosenOpt = i <= 4 ? optRetro : i <= 7 ? optHarvest : i === 8 ? optSciFi : optSea;
      await Vote.create({ pollId: closedPoll._id, userId: dummy._id, optionId: chosenOpt });
    }

    console.log('Demo seed completed successfully!');
    console.log(`Created 4 polls (3 Active, 1 Closed with 13 votes and winner determined).`);
    console.log(`Demo accounts:`);
    console.log(`- alice@community.org (password: password123) [Admin / @community.org member]`);
    console.log(`- carol@gmail.com (password: password123) [Outside user]`);
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

if (require.main === module) {
  seedData().then(() => process.exit(0));
}

module.exports = seedData;

