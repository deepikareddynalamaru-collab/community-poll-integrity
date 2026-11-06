import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pollApi } from '../api/pollApi';
import { PollCard } from '../components/PollCard';
import { Alert } from '../components/Alert';

export const PollListPage = () => {
  const [activeTab, setActiveTab] = useState('open'); // 'open' | 'closed'
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPolls = async (status) => {
    setLoading(true);
    setError(null);
    try {
      const data = await pollApi.getPolls(status);
      setPolls(data.polls || []);
    } catch (err) {
      setError(err.message || 'Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls(activeTab);
  }, [activeTab]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Community Polls</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Transparent, authenticated polling with zero vote leaking before closure.
          </p>
        </div>
        <Link to="/polls/create" className="btn btn-primary">
          + Create Poll
        </Link>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'open' ? 'active' : ''}`}
          onClick={() => setActiveTab('open')}
        >
          Active Polls
        </button>
        <button
          className={`tab-btn ${activeTab === 'closed' ? 'active' : ''}`}
          onClick={() => setActiveTab('closed')}
        >
          Closed Polls (Results Ready)
        </button>
      </div>

      <Alert type="danger" message={error} onClose={() => setError(null)} />

      {loading ? (
        <div className="loading-box">
          <p>Loading polls...</p>
        </div>
      ) : polls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No {activeTab} polls found</div>
          <p className="empty-state-text">
            {activeTab === 'open'
              ? 'There are currently no active polls open for voting.'
              : 'No closed polls have concluded yet.'}
          </p>
          {activeTab === 'open' && (
            <Link to="/polls/create" className="btn btn-primary">
              Create the First Poll
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
};

