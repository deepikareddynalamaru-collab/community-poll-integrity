import React from 'react';

export const Alert = ({ type = 'danger', message, onClose }) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`} role="alert">
      <div style={{ flex: 1 }}>{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
            color: 'inherit',
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          &times;
        </button>
      )}
    </div>
  );
};

