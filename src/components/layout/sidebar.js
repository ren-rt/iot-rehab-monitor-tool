import React from 'react';
import './sidebar.css';

export default function Sidebar({ activePage, onPageChange, onLogout }) {
  const menuItems = [
    { id: 'profile', label: 'Profile', icon: '👤' },
      { id: 'exerciseLib', label: 'Exercise Library', icon: '📚' },
    { id: 'therapy', label: 'Therapy Checklist', icon: '🦾' },
    { id: 'history', label: 'Session Details', icon: '📋' },
    { id: 'sessionRecording', label: 'Session Recording', icon: '⏺️' }
  ];

  return (
    <div className="sidebar">
      <div className="logo-section">
        <div className="logo">RehabMate</div>
      </div>

      <nav className="nav-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onPageChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="logout-btn" onClick={onLogout}>
        <span className="nav-icon">🚪</span>
        <span className="nav-label">Logout</span>
      </button>
    </div>
  );
}