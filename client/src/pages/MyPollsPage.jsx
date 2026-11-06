import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pollApi } from '../api/pollApi';
import { PollCard } from '../components/PollCard';
import { Alert } from '../components/Alert';

export const MyPollsPage = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchMyPolls = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pollApi.getMyPolls();
      setPolls(data.polls || []);
    } catch (err) {
      setError(err.message || 'Failed to load your polls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPolls();
  }, []);

  const handleEndPoll = async (pollId) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await pollApi.closePoll(pollId);
      setSuccessMessage('Poll has been ended successfully.');
      await fetchMyPolls();
    } catch (err) {
      setError(err.message || 'Failed to end poll');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Polls</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Polls you have created and are administering.
          </p>
        </div>
        <Link to="/polls/create" className="btn btn-primary">
          + Create New Poll
        </Link>
      </div>

      <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
      <Alert type="danger" message={error} onClose={() => setError(null)} />

      {loading ? (
        <div className="loading-box">
          <p>Loading your polls...</p>
        </div>
      ) : polls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">You haven't created any polls yet</div>
          <p className="empty-state-text">
            Start a transparent poll for your club, team, or community.
          </p>
          <Link to="/polls/create" className="btn btn-primary">
            Create Your First Poll
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} onEndPoll={handleEndPoll} />
          ))}
        </div>
      )}
    </div>
  );
};
