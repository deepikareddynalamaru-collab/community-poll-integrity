import React from 'react';

export const ResultsBarChart = ({ options = [], totalVotes = 0, winners = [] }) => {
  const winnerIds = new Set(
    winners.map((w) => (w.id ? w.id.toString() : w._id ? w._id.toString() : ''))
  );
  const isTied = winners.length > 1;

  return (
    <div className="results-chart-container">
      {options.map((option) => {
        const optId = option.id ? option.id.toString() : option._id ? option._id.toString() : '';
        const isWinner = winnerIds.has(optId);
        const percentage = option.percentage || 0;
        const count = option.count || 0;

        return (
          <div key={optId} className="result-row">
            <div className="result-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ color: isWinner ? 'var(--text-main)' : 'inherit', fontWeight: isWinner ? 700 : 500 }}>
                  {option.text}
                </span>
                {isWinner && (
                  <span className="badge badge-winner">
                    {isTied ? '🤝 Tied Winner' : '🏆 Winner'}
                  </span>
                )}
              </div>
              <div className="result-meta">
                <span style={{ fontWeight: 700 }}>{percentage}%</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  ({count} {count === 1 ? 'vote' : 'votes'})
                </span>
              </div>
            </div>

            <div className="result-bar-bg" aria-label={`${option.text}: ${percentage}%`}>
              <div
                className={`result-bar-fill ${isWinner ? 'winner-fill' : ''}`}
                style={{ width: `${Math.max(percentage, count > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <span>Total Votes Cast: <strong>{totalVotes}</strong></span>
        <span>
          {totalVotes > 0 ? (
            <>Percentages sum to <strong>100%</strong></>
          ) : (
            'No votes recorded'
          )}
        </span>
      </div>
    </div>
  );
};
