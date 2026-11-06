/**
 * Checks if a user is eligible for a given poll.
 * @param {Object} user - User document containing email
 * @param {Object} eligibility - Eligibility configuration from poll
 * @returns {{ isEligible: boolean, reason: string | null }}
 */
const checkUserEligibility = (user, eligibility) => {
  if (!user || !user.email) {
    return { isEligible: false, reason: 'User email is required for eligibility check' };
  }

  const userEmail = user.email.toLowerCase().trim();
  const type = eligibility?.type || 'any';

  switch (type) {
    case 'any':
      return { isEligible: true, reason: null };

    case 'domain': {
      if (!eligibility.domain) {
        return { isEligible: false, reason: 'Poll eligibility domain is not configured' };
      }
      // Normalize domain (strip leading @ if present)
      const targetDomain = eligibility.domain.toLowerCase().trim().replace(/^@/, '');
      const userDomain = userEmail.split('@')[1];

      if (userDomain === targetDomain || userEmail.endsWith(`@${targetDomain}`)) {
        return { isEligible: true, reason: null };
      }
      return {
        isEligible: false,
        reason: `Only users with email ending with @${targetDomain} are eligible to vote`,
      };
    }

    case 'invite': {
      const allowedEmails = (eligibility.allowedEmails || []).map((e) => e.toLowerCase().trim());
      if (allowedEmails.includes(userEmail)) {
        return { isEligible: true, reason: null };
      }
      return {
        isEligible: false,
        reason: 'Your email address is not on the invited voter list for this poll',
      };
    }

    default:
      return { isEligible: false, reason: 'Unknown eligibility type' };
  }
};

module.exports = {
  checkUserEligibility,
};

