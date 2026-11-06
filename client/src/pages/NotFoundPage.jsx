import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center' }}>
      <div className="card" style={{ padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
          404
        </h1>
        <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Page Not Found
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          The page or poll you are looking for does not exist or has been moved.
        </p>
        <Link to="/polls" className="btn btn-primary">
          Return to Polls
        </Link>
      </div>
    </div>
  );
};

