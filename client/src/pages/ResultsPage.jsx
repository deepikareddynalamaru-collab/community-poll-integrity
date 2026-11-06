import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pollApi } from '../api/pollApi';
import { ResultsBarChart } from '../components/ResultsBarChart';
import { StatusBadge } from '../components/StatusBadge';
import { Alert } from '../components/Alert';

export const ResultsPage = () => {
  const { id } = useParams();
  const [pollResults, setPollResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      setIsLocked(false);

      try {
        const data = await pollApi.getResults(id);
        setPollResults(data.poll);
      } catch (err) {
        if (err.status === 403 || err.code === 'RESULTS_LOCKED') {
          setIsLocked(true);
        } else {
          setError(err.message || 'Failed to load results');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-box">
        <p>Loading final results...</p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div style={{ maxWidth: '640px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>
            Results Are Locked
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            In accordance with poll integrity rules, results, turnout counts, and lead status remain strictly locked and undisclosed until the poll closes.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to={`/polls/${id}`} className="btn btn-primary">
              View Poll & Vote
            </Link>
            <Link to="/polls" className="btn btn-secondary">
              Back to Polls
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error && !pollResults) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <Alert type="danger" message={error} />
        <Link to="/polls" className="btn btn-secondary">
          &larr; Back to Polls
        </Link>
      </div>
    );
  }

  const { title, description, closesAt, totalVotes, options, winners } = pollResults;
  const closesDate = new Date(closesAt);
  const formattedClosesAt = closesDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/polls" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          &larr; Back to Polls
        </Link>
        <Link to={`/polls/${id}`} className="btn btn-secondary btn-sm">
          View Original Poll
        </Link>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h1 className="card-title" style={{ fontSize: '1.5rem' }}>{title} - Final Results</h1>
          <StatusBadge status="closed" />
        </div>

        {description && (
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {description}
          </p>
        )}

        <div className="poll-meta-row" style={{ marginBottom: '1.5rem' }}>
          <span>Closed at: <strong>{formattedClosesAt}</strong></span>
          <span>•</span>
          <span>Total verified ballots: <strong>{totalVotes}</strong></span>
        </div>

        {/* Winner Announcement Banner */}
        {totalVotes > 0 && winners && winners.length > 0 && (
          <div
            style={{
              background: '#fefce8',
              border: '1px solid #fde047',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.75rem' }}>🏆</span>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#854d0e', fontWeight: 700 }}>
                {winners.length > 1 ? 'Official Result (Tie)' : 'Official Result (Winner)'}
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#713f12' }}>
                {winners.map((w) => w.text).join(' & ')}
              </div>
            </div>
          </div>
        )}

        {totalVotes === 0 && (
          <div className="alert alert-info">
            <span>ℹ</span>
            <div>No votes were cast in this poll before it closed.</div>
          </div>
        )}

        {/* CSS/SVG Bar Chart */}
        <ResultsBarChart
          options={options}
          totalVotes={totalVotes}
          winners={winners}
        />
      </div>
    </div>
  );
};

