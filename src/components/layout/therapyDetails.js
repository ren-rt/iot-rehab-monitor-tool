import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebase/config';
import './therapyDetails.css';

function flexToAngle(raw) {
  const normalized = Math.max(0, Math.min(4095, raw)) / 4095;
  return Math.round((normalized - 0.5) * 120 + 60);
}

function generateComments(current, previous) {
  const comments = [];

  const currFlex = flexToAngle(current.sensors?.flex?.raw || 0);
  const prevFlex = flexToAngle(previous.sensors?.flex?.raw || 0);
  const flexDiff = currFlex - prevFlex;

  if (Math.abs(flexDiff) >= 3) {
    if (flexDiff > 0) comments.push(`📈 Range of motion improved by ${flexDiff}° since last session`);
    else comments.push(`📉 Range of motion decreased by ${Math.abs(flexDiff)}° — keep pushing!`);
  } else {
    comments.push(`➡️ Range of motion stable (${currFlex}°)`);
  }

  const currFsr = current.sensors?.fsr?.raw || 0;
  const prevFsr = previous.sensors?.fsr?.raw || 0;
  const fsrDiff = currFsr - prevFsr;

  if (Math.abs(fsrDiff) > 100) {
    if (fsrDiff > 0) comments.push(`💪 Grip/pressure strength increased — great progress!`);
    else comments.push(`⚠️ Pressure response lower than last session`);
  } else {
    comments.push(`✅ Pressure response consistent`);
  }

  const currLabel = current.sensors?.fsr?.label || 'none';
  if (currLabel === 'medium' || currLabel === 'heavy') {
    comments.push(`🏆 Achieving ${currLabel} pressure — excellent effort!`);
  }

  return comments;
}

export default function TherapyDetailsPage() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const sessionsRef = ref(database, `sessions/${currentUser.uid}`);
    onValue(sessionsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setSessions(list);
      } else {
        setSessions([]);
      }
      setLoading(false);
    });
  }, [currentUser]);

  if (loading) return (
    <div className="page-container">
      <h2>Session History</h2>
      <div className="loading-spinner">Loading sessions...</div>
    </div>
  );

  return (
    <div className="page-container">
      <h2>Session History</h2>

      {sessions.length === 0 ? (
        <div className="no-data">
          <p>No sessions recorded yet.</p>
          <p className="hint">Start a therapy session from the Therapy Checklist!</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map((session, index) => {
            const previous = sessions[index + 1];
            const comments = previous ? generateComments(session, previous) : null;
            const flexAngle = flexToAngle(session.sensors?.flex?.raw || 0);
            const fsrLabel = session.sensors?.fsr?.label || 'none';
            const isExpanded = expanded === session.id;

            return (
              <div key={session.id} className="session-card" onClick={() => setExpanded(isExpanded ? null : session.id)}>
                <div className="session-header">
                  <div className="session-meta">
                    <span className="session-limb">{session.limb}</span>
                    <span className="session-date">{session.date} {session.time}</span>
                  </div>
                  <div className="session-badges">
                    <span className="badge flex-badge">Flex: {flexAngle}°</span>
                    <span className={`badge fsr-badge fsr-${fsrLabel}`}>{fsrLabel.replace('_', ' ')}</span>
                    {index === 0 && <span className="badge latest-badge">Latest</span>}
                  </div>
                  <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && (
                  <div className="session-body">
                    <div className="session-exercises">
                      <strong>Exercises:</strong> {session.exercises?.join(', ') || '—'}
                    </div>

                    <div className="sensor-summary">
                      <div className="sensor-item">
                        <span className="sensor-label">IMU2 ax</span>
                        <span className="sensor-value">{session.sensors?.imu2?.ax ?? '—'}</span>
                      </div>
                      <div className="sensor-item">
                        <span className="sensor-label">IMU2 ay</span>
                        <span className="sensor-value">{session.sensors?.imu2?.ay ?? '—'}</span>
                      </div>
                      <div className="sensor-item">
                        <span className="sensor-label">Flex Raw</span>
                        <span className="sensor-value">{session.sensors?.flex?.raw ?? '—'}</span>
                      </div>
                      <div className="sensor-item">
                        <span className="sensor-label">Pressure</span>
                        <span className="sensor-value">{session.sensors?.fsr?.raw ?? '—'}</span>
                      </div>
                    </div>

                    {comments && (
                      <div className="comments-section">
                        <strong>Progress vs Last Session:</strong>
                        <ul className="comments-list">
                          {comments.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}

                    {!comments && (
                      <div className="comments-section">
                        <p className="first-session-note">🎯 This is your first recorded session — keep going to track progress!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}