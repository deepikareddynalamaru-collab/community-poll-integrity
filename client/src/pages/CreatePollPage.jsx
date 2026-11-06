import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { pollApi } from '../api/pollApi';
import { Alert } from '../components/Alert';

export const CreatePollPage = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']); // Start with 2 empty options
  const [eligibilityType, setEligibilityType] = useState('any'); // 'any' | 'domain' | 'invite'
  const [domain, setDomain] = useState('');
  const [allowedEmailsText, setAllowedEmailsText] = useState('');

  // Default closesAt to tomorrow same time
  const getDefaultClosesAt = () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setSeconds(0, 0);
    // Format YYYY-MM-DDTHH:mm
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [closesAt, setClosesAt] = useState(getDefaultClosesAt());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate options
    const trimmedOptions = options.map((opt) => opt.trim()).filter(Boolean);
    if (trimmedOptions.length < 2) {
      setError('Please provide at least 2 non-empty options.');
      return;
    }
    if (trimmedOptions.length > 10) {
      setError('A poll cannot exceed 10 options.');
      return;
    }

    // Validate closesAt
    const selectedDate = new Date(closesAt);
    if (isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
      setError('Closing time must be set in the future.');
      return;
    }

    // Prepare eligibility payload
    const eligibilityPayload = {
      type: eligibilityType,
    };

    if (eligibilityType === 'domain') {
      if (!domain.trim()) {
        setError('Please enter a domain for domain-restricted eligibility.');
        return;
      }
      eligibilityPayload.domain = domain.trim().replace(/^@/, '');
    } else if (eligibilityType === 'invite') {
      const emailList = allowedEmailsText
        .split(/[\n,]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (emailList.length === 0) {
        setError('Please enter at least one email for invite-only eligibility.');
        return;
      }
      eligibilityPayload.allowedEmails = emailList;
    }

    setLoading(true);
    try {
      const res = await pollApi.createPoll({
        title: title.trim(),
        description: description.trim(),
        options: trimmedOptions,
        closesAt: selectedDate.toISOString(),
        eligibility: eligibilityPayload,
      });

      navigate(`/polls/${res.poll.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create poll.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/polls" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          &larr; Back to Polls
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Create a Transparent Poll</h1>
          <p className="card-subtitle">
            Configure poll options, future closing time, and verified eligibility rules.
          </p>
        </div>

        <Alert type="danger" message={error} onClose={() => setError(null)} />

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="title">Poll Title *</label>
            <input
              id="title"
              type="text"
              className="form-control"
              placeholder="e.g. 2026 Board Election"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              className="form-control"
              placeholder="Provide background context or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>

          {/* Dynamic Options */}
          <div className="form-group">
            <label className="form-label">
              Voting Options * (Min 2, Max 10)
            </label>
            <div className="options-list">
              {options.map((option, idx) => (
                <div key={idx} className="option-input-row">
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, width: '24px', color: 'var(--text-muted)' }}>
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Option ${idx + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="btn btn-secondary btn-sm"
                      title="Remove option"
                      style={{ padding: '0.5rem 0.75rem', color: 'var(--danger)' }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={addOption}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.25rem' }}
              >
                + Add Option ({options.length}/10)
              </button>
            )}
          </div>

          {/* Closes At */}
          <div className="form-group">
            <label className="form-label" htmlFor="closesAt">
              Closing Time * (Server Time Enforced)
            </label>
            <input
              id="closesAt"
              type="datetime-local"
              className="form-control"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              required
            />
            <div className="form-hint">
              Results stay completely secret until this exact timestamp arrives.
            </div>
          </div>

          {/* Eligibility Rules */}
          <div className="form-group">
            <label className="form-label">Eligibility Rule *</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="radio"
                  name="eligibility"
                  value="any"
                  checked={eligibilityType === 'any'}
                  onChange={() => setEligibilityType('any')}
                />
                All Registered Users
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="radio"
                  name="eligibility"
                  value="domain"
                  checked={eligibilityType === 'domain'}
                  onChange={() => setEligibilityType('domain')}
                />
                Email Domain Restriction
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="radio"
                  name="eligibility"
                  value="invite"
                  checked={eligibilityType === 'invite'}
                  onChange={() => setEligibilityType('invite')}
                />
                Invite-Only List
              </label>
            </div>

            {eligibilityType === 'domain' && (
              <div style={{ marginTop: '0.5rem' }}>
                <label className="form-label" htmlFor="domain">Allowed Email Domain</label>
                <input
                  id="domain"
                  type="text"
                  className="form-control"
                  placeholder="e.g. acme.org or student.edu"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                />
                <div className="form-hint">Only voters whose emails end with @{domain || 'domain'} can cast a vote.</div>
              </div>
            )}

            {eligibilityType === 'invite' && (
              <div style={{ marginTop: '0.5rem' }}>
                <label className="form-label" htmlFor="allowedEmails">Invited Emails</label>
                <textarea
                  id="allowedEmails"
                  className="form-control"
                  placeholder="Paste invited emails separated by commas or newlines:&#10;alice@example.com&#10;bob@example.com"
                  value={allowedEmailsText}
                  onChange={(e) => setAllowedEmailsText(e.target.value)}
                  rows={3}
                  required
                />
                <div className="form-hint">Only specific emails on this list can vote.</div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ marginTop: '1.5rem' }}
          >
            {loading ? 'Creating Poll...' : 'Publish Poll'}
          </button>
        </form>
      </div>
    </div>
  );
};

