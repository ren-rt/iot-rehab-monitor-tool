import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebase/config';
import './profile.css';

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Reference to the user's data in Realtime Database
    const userRef = ref(database, `users/${currentUser.uid}`);
    
    // Listen for real-time updates
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Fetched user data:', data); // Debug log
      setUserData(data);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="page-container">
        <h2>Patient Profile</h2>
        <div className="loading-spinner">Loading profile data...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2>Patient Profile</h2>
      
      {userData ? (
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {userData.name?.charAt(0) || 'P'}
            </div>
            <div className="profile-name">
              <h3>{userData.name || 'Not provided'}</h3>
              <p className="patient-role">{userData.role || 'Patient'}</p>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-group">
              <h4>Personal Information</h4>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{userData.email || currentUser?.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Age:</span>
                <span className="detail-value">{userData.age || 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Gender:</span>
                <span className="detail-value">{userData.gender || 'Not specified'}</span>
              </div>
            </div>

            <div className="detail-group">
              <h4>Medical Information</h4>
              <div className="detail-row">
                <span className="detail-label">Affected Limb:</span>
                <span className="detail-value">{userData.affectedLimb || 'Not specified'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">{userData.duration ? `${userData.duration} months` : 'Not specified'}</span>
              </div>
            </div>

            <div className="detail-group">
              <h4>Account Information</h4>
              <div className="detail-row">
                <span className="detail-label">Patient ID:</span>
                <span className="detail-value patient-id">{currentUser.uid}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Registered:</span>
                <span className="detail-value">
                  {userData.registeredAt ? new Date(userData.registeredAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">
          <p>No profile data available.</p>
          <p className="hint">Please complete your registration or contact support.</p>
        </div>
      )}
    </div>
  );
}