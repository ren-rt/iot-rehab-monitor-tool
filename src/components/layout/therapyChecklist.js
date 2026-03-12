import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ref, onValue, push, set } from 'firebase/database';
import { database } from '../../firebase/config';
import './therapyChecklist.css';

function TherapyChecklist({ onPageChange }) {
  const { currentUser } = useAuth();
  const [selectedLimb, setSelectedLimb] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [libraryExercises, setLibraryExercises] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const limbOptions = ["Right Hand", "Left Hand", "Right Leg", "Left Leg"];

  useEffect(() => {
    const exercisesRef = ref(database, 'exercise_library');
    onValue(exercisesRef, (snapshot) => {
      const data = snapshot.val();
      setLibraryExercises(data || { right_hand: {}, left_hand: {}, right_leg: {}, left_leg: {} });
      setLoading(false);
    });
  }, []);

  const getExercisesForCategory = () => {
    if (!selectedLimb) return [];
    if (selectedLimb === "Right Hand" || selectedLimb === "Left Hand") {
      const r = libraryExercises.right_hand ? Object.values(libraryExercises.right_hand).map(e => e.name) : [];
      const l = libraryExercises.left_hand ? Object.values(libraryExercises.left_hand).map(e => e.name) : [];
      return [...new Set([...r, ...l])];
    } else {
      const r = libraryExercises.right_leg ? Object.values(libraryExercises.right_leg).map(e => e.name) : [];
      const l = libraryExercises.left_leg ? Object.values(libraryExercises.left_leg).map(e => e.name) : [];
      return [...new Set([...r, ...l])];
    }
  };

  const currentExercises = getExercisesForCategory();

  const handleLimbChange = (limb) => {
    if (selectedLimb === limb) { setSelectedLimb(""); setSelectedExercises([]); }
    else { setSelectedLimb(limb); setSelectedExercises([]); }
  };

  const handleExerciseChange = (exercise) => {
    setSelectedExercises(prev =>
      prev.includes(exercise) ? prev.filter(ex => ex !== exercise) : [...prev, exercise]
    );
  };

  const handleStartTherapy = async () => {
    if (!selectedLimb || selectedExercises.length === 0) return;
    setSaving(true);

    try {
      const userId = currentUser?.uid || 'anonymous';
      const sessionId = Date.now().toString();

      // Write active session to Firebase
      await set(ref(database, `active_session/${userId}`), {
        sessionId,
        limb: selectedLimb,
        exercises: selectedExercises,
        startTime: Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        status: 'active'
      });

      // Navigate to visualization
      onPageChange('visualization');
    } catch (err) {
      console.error("Error starting session:", err);
      alert("❌ Error starting session");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading exercises...</div>;

  return (
    <div className="container">
      <h2 className="title">🏥 Therapy Checklist</h2>

      <div className="limbBox">
        <label className="boxLabel">Select a limb for therapy:</label>
        <div className="checklistContainer">
          {limbOptions.map((limb) => (
            <div key={limb} className="checklistItem">
              <input type="checkbox" id={limb} checked={selectedLimb === limb}
                onChange={() => handleLimbChange(limb)} className="checkbox" />
              <label htmlFor={limb} className={`checkboxLabel ${selectedLimb === limb ? "selectedLabel" : ""}`}>
                {limb}
              </label>
            </div>
          ))}
        </div>
      </div>

      {selectedLimb && (
        <div className="exerciseBox">
          <label className="exerciseLabel">🏋️ Exercises for {selectedLimb}:</label>
          <div className="checklistContainer">
            {currentExercises.length > 0 ? currentExercises.map((ex) => (
              <div key={ex} className="checklistItem">
                <input type="checkbox" id={ex} checked={selectedExercises.includes(ex)}
                  onChange={() => handleExerciseChange(ex)} className="checkbox" />
                <label htmlFor={ex} className={`checkboxLabel ${selectedExercises.includes(ex) ? "selectedLabel" : ""}`}>
                  {ex}
                </label>
              </div>
            )) : (
              <p className="emptyText">No exercises found. Add exercises in the Exercise Library.</p>
            )}
          </div>
        </div>
      )}

      {selectedExercises.length > 0 && (
        <div className="resultBox">
          <p className="resultText">
            ✅ Selected: <b>{selectedLimb}</b> → <b>{selectedExercises.join(", ")}</b>
          </p>
        </div>
      )}

      {selectedExercises.length > 0 && (
        <div className="buttonWrapper">
          <button onClick={handleStartTherapy} className="bookButton" disabled={saving}
            style={{ padding: "18px 32px", fontSize: "20px" }}>
            {saving ? 'Starting...' : '🚀 Start Therapy'}
          </button>
        </div>
      )}
    </div>
  );
}

export default TherapyChecklist;