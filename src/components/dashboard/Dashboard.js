import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Sidebar from '../layout/sidebar';
import './dashboard.css';

import ProfilePage from '../layout/profile';
import TherapyPage from '../layout/therapyChecklist';
import HistoryPage from '../layout/therapyDetails';
import VisualizationPage from '../layout/visualization';
import ExerciseLibPage from '../layout/exerciseLib';
import SessionRecordingPage from '../layout/sessionRecording';

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('profile');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderPage = () => {
    switch(activePage) {
      case 'profile': return <ProfilePage />;
      case 'therapy': return <TherapyPage onPageChange={setActivePage} />;
      case 'history': return <HistoryPage />;
      case 'visualization': return <VisualizationPage onPageChange={setActivePage} />;
      case 'exerciseLib': return <ExerciseLibPage />;
      case 'sessionRecording': return <SessionRecordingPage />;
      default: return <ProfilePage />;
    }
  };

  return (
    <div className="dashboard">
      <Sidebar activePage={activePage} onPageChange={setActivePage} onLogout={handleLogout} />
      <div className="main-panel">
        {renderPage()}
      </div>
    </div>
  );
}