import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pollApi } from '../api/pollApi';
import { StatusBadge } from '../components/StatusBadge';
import { Alert } from '../components/Alert';

export const PollDetailPage = () => {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchPoll = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pollApi.getPollById(id);
      setPoll(data.poll);
      if (data.poll.votedOptionId) {
        setSelectedOption(data.poll.votedOptionId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load poll details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [id]);

  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOption) {
      setError('Please select an option to cast your vote');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await pollApi.vote(id, selectedOption);
      setSuccessMessage('Your vote has been cast and recorded successfully!');
      // Re-fetch to update hasVoted state
      await fetchPoll();
    } catch (err) {
      setError(err.message || 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndPoll = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      await pollApi.closePoll(id);
      setSuccessMessage('Poll has been ended successfully.');
      await fetchPoll();
    } catch (err) {
      setError(err.message || 'Failed to end poll');
    }
  };

  if (loading) {
    return (
      <div className="loading-box">
        <p>Loading poll details...</p>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <Alert type="danger" message={error} />
        <Link to="/polls" className="btn btn-secondary">
          &larr; Back to Polls
        </Link>
      </div>
    );
  }

  const isOpen = poll.status === 'open';
  const hasVoted = poll.hasVoted;
  const isEligible = poll.isEligible;
  const canVote = isOpen && !hasVoted && isEligible;

  const closesDate = new Date(poll.closesAt);
  const formattedClosesAt = closesDate.toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/polls" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          &larr; Back to Polls
        </Link>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <h1 className="card-title" style={{ fontSize: '1.5rem' }}>{poll.title}</h1>
          <StatusBadge status={poll.status} />
        </div>

        {poll.description && (
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
            {poll.description}
          </p>
        )}

        <div className="poll-meta-row" style={{ marginBottom: '1.25rem' }}>
          <span>
            {isOpen ? `Closes: ` : `Closed: `}
            <strong>{formattedClosesAt}</strong>
          </span>
          <span>•</span>
          <span>
            Eligibility: <strong>
              {poll.eligibility?.type === 'domain'
                ? `@${poll.eligibility.domain} members`
                : poll.eligibility?.type === 'invite'
                ? 'Invited emails only'
                : 'All registered accounts'}
            </strong>
          </span>
        </div>

        <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
        <Alert type="danger" message={error} onClose={() => setError(null)} />

        {isOpen && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleEndPoll}
            style={{ marginBottom: '1rem' }}
          >
            End poll
          </button>
        )}

        {/* State Banners */}
        {hasVoted && (
          <div className="alert alert-info">
            <span>✓</span>
            <div>
              <strong>You have already voted.</strong> Your vote is locked and secured in the database.
            </div>
          </div>
        )}

        {!isEligible && (
          <div className="alert alert-warning">
            <span>⚠</span>
            <div>
              <strong>You are not eligible to vote:</strong> {poll.ineligibleReason}
            </div>
          </div>
        )}

        {!isOpen && (
          <div className="alert alert-info">
            <span>ℹ</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <strong>Poll closed.</strong> Voting has concluded.
              </div>
              <Link to={`/polls/${poll.id}/results`} className="btn btn-primary btn-sm">
                View Final Results
              </Link>
            </div>
          </div>
        )}

        {/* Voting Form */}
        <form onSubmit={handleVoteSubmit}>
          <div className="vote-options-group">
            {poll.options.map((option) => {
              const isSelected = selectedOption === option.id;
              return (
                <label
                  key={option.id}
                  className={`vote-option-label ${isSelected ? 'selected' : ''}`}
                  style={{ cursor: canVote ? 'pointer' : 'default' }}
                >
                  <input
                    type="radio"
                    name="pollOption"
                    value={option.id}
                    checked={isSelected}
                    disabled={!canVote}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="vote-option-radio"
                  />
                  <span className="vote-option-text">{option.text}</span>
                  {hasVoted && poll.votedOptionId === option.id && (
                    <span className="badge badge-open" style={{ marginLeft: 'auto' }}>
                      Your Vote
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {canVote ? (
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting || !selectedOption}
              style={{ marginTop: '1.25rem' }}
            >
              {submitting ? 'Recording Vote...' : 'Submit Vote'}
            </button>
          ) : (
            isOpen && (
              <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                {hasVoted ? 'Results will become visible after the poll closes.' : 'Voting is disabled.'}
              </div>
            )
          )}
        </form>

        {!isOpen && (
          <div style={{ marginTop: '1.25rem' }}>
            <Link to={`/polls/${poll.id}/results`} className="btn btn-primary btn-block">
              View Final Results & Breakdown
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

