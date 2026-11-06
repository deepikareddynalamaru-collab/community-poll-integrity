/**
 * Calculates per-option counts and percentages that sum to exactly 100%
 * using the Largest Remainder Method (Hare-Niemeyer).
 *
 * @param {Array<{ _id: any, text: string }>} options - Array of poll options
 * @param {Array<{ optionId: any }>} votes - Array of votes cast
 * @returns {{
 *   totalVotes: number,
 *   options: Array<{ id: string, text: string, count: number, percentage: number }>,
 *   winners: Array<{ id: string, text: string, count: number }>
 * }}
 */
const calculateResults = (options, votes) => {
  const totalVotes = votes.length;

  // Build map of option counts
  const countMap = new Map();
  for (const opt of options) {
    countMap.set(opt._id.toString(), 0);
  }

  for (const vote of votes) {
    const key = vote.optionId.toString();
    if (countMap.has(key)) {
      countMap.set(key, countMap.get(key) + 1);
    }
  }

  if (totalVotes === 0) {
    return {
      totalVotes: 0,
      options: options.map((opt) => ({
        id: opt._id.toString(),
        text: opt.text,
        count: 0,
        percentage: 0,
      })),
      winners: [],
    };
  }

  // Calculate percentages using Largest Remainder Method
  const items = options.map((opt) => {
    const optId = opt._id.toString();
    const count = countMap.get(optId) || 0;
    const exactPct = (count / totalVotes) * 100;
    const floorPct = Math.floor(exactPct);
    const remainder = exactPct - floorPct;
    return {
      id: optId,
      text: opt.text,
      count,
      floorPct,
      remainder,
      percentage: floorPct,
    };
  });

  const sumFloor = items.reduce((sum, item) => sum + item.floorPct, 0);
  let difference = 100 - sumFloor;

  // Distribute remaining points to largest remainders
  const sortedByRemainder = [...items].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < difference; i++) {
    sortedByRemainder[i % sortedByRemainder.length].percentage += 1;
  }

  // Determine winner(s)
  let maxCount = -1;
  for (const item of items) {
    if (item.count > maxCount) {
      maxCount = item.count;
    }
  }

  const winners = items
    .filter((item) => item.count === maxCount && maxCount > 0)
    .map((item) => ({
      id: item.id,
      text: item.text,
      count: item.count,
    }));

  return {
    totalVotes,
    options: items.map(({ id, text, count, percentage }) => ({
      id,
      text,
      count,
      percentage,
    })),
    winners,
  };
};

module.exports = {
  calculateResults,
};

