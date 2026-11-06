import React from 'react';

export const StatusBadge = ({ status }) => {
  const isOpen = status === 'open';
  return (
    <span className={`badge ${isOpen ? 'badge-open' : 'badge-closed'}`}>
      {isOpen ? '● Open' : '✕ Closed'}
    </span>
  );
};

