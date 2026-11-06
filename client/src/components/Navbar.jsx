import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to={isAuthenticated ? '/polls' : '/login'} className="navbar-brand">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>Poll Integrity</span>
        </Link>

        <nav className="navbar-nav">
          {isAuthenticated ? (
            <>
              <NavLink to="/polls" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                Polls
              </NavLink>
              <NavLink to="/my-polls" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                My Polls
              </NavLink>
              <NavLink to="/polls/create" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                + Create Poll
              </NavLink>
              <span className="user-badge" title={user?.email}>
                👤 {user?.name}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Login
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

