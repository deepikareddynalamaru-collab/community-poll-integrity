import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';

export const PollCard = ({ poll, onEndPoll }) => {
  const isOpen = poll.status === 'open';
  const closesDate = new Date(poll.closesAt);
  const formattedClosesAt = closesDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const getEligibilityLabel = () => {
    if (poll.eligibility?.type === 'domain') {
      return `Domain: @${poll.eligibility.domain}`;
    }
    if (poll.eligibility?.type === 'invite') {
      return `Invite Only (${poll.eligibility.allowedEmails?.length || 0} invited)`;
    }
    return 'Public (All Members)';
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <h3 className="card-title" style={{ fontSize: '1.125rem' }}>
          <Link to={`/polls/${poll.id}`}>{poll.title}</Link>
        </h3>
        <StatusBadge status={poll.status} />
      </div>

      {poll.description && (
        <p className="card-subtitle" style={{ marginBottom: '0.75rem' }}>
          {poll.description}
        </p>
      )}

      <div className="poll-meta-row">
        <span className="badge badge-eligibility">
          {getEligibilityLabel()}
        </span>
        <span>
          {isOpen ? `Closes: ${formattedClosesAt}` : `Closed: ${formattedClosesAt}`}
        </span>
        {poll.optionsCount && (
          <span>• {poll.optionsCount} options</span>
        )}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link to={`/polls/${poll.id}`} className="btn btn-secondary btn-sm">
          {isOpen ? 'Vote / Details' : 'Poll Details'}
        </Link>
        {!isOpen && (
          <Link to={`/polls/${poll.id}/results`} className="btn btn-primary btn-sm">
            View Final Results
          </Link>
        )}
        {isOpen && onEndPoll && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onEndPoll(poll.id)}
          >
            End poll
          </button>
        )}
      </div>
    </div>
  );
};

