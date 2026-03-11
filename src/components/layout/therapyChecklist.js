import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ref, onValue, push, set } from 'firebase/database';
import { database } from '../../firebase/config';
import './therapyChecklist.css';

function TherapyChecklist() {
  const [selectedLimb, setSelectedLimb] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [bookedTherapy, setBookedTherapy] = useState("");
  const [sessionStatus, setSessionStatus] = useState("pending");
  const [libraryExercises, setLibraryExercises] = useState({});
  const [loading, setLoading] = useState(true);

  const limbOptions = ["Right Hand", "Left Hand", "Right Leg", "Left Leg"];

  // Load exercises from Exercise Library Firebase
  useEffect(() => {
    const exercisesRef = ref(database, 'exercise_library');
    onValue(exercisesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLibraryExercises(data);
      } else {
        setLibraryExercises({
          right_hand: {},
          left_hand: {},
          right_leg: {},
          left_leg: {}
        });
      }
      setLoading(false);
    });
  }, []);

  // Get exercise names based on category (all hand exercises or all leg exercises)
  const getExercisesForCategory = () => {
    if (!selectedLimb) return [];
    
    if (selectedLimb === "Right Hand" || selectedLimb === "Left Hand") {
      // Show all hand exercises from both right and left hand libraries
      const rightHandExercises = libraryExercises.right_hand 
        ? Object.values(libraryExercises.right_hand).map((ex) => ex.name)
        : [];
      const leftHandExercises = libraryExercises.left_hand
        ? Object.values(libraryExercises.left_hand).map((ex) => ex.name)
        : [];
      return [...new Set([...rightHandExercises, ...leftHandExercises])]; // Remove duplicates
    } else if (selectedLimb === "Right Leg" || selectedLimb === "Left Leg") {
      // Show all leg exercises from both right and left leg libraries
      const rightLegExercises = libraryExercises.right_leg
        ? Object.values(libraryExercises.right_leg).map((ex) => ex.name)
        : [];
      const leftLegExercises = libraryExercises.left_leg
        ? Object.values(libraryExercises.left_leg).map((ex) => ex.name)
        : [];
      return [...new Set([...rightLegExercises, ...leftLegExercises])]; // Remove duplicates
    }
    return [];
  };

  const currentExercises = getExercisesForCategory();

  const handleLimbChange = (limb) => {
    if (selectedLimb === limb) {
      setSelectedLimb("");
      setSelectedExercises([]);
    } else {
      setSelectedLimb(limb);
      setSelectedExercises([]);
    }
  };

  const handleExerciseChange = (exercise) => {
    setSelectedExercises((prev) =>
      prev.includes(exercise)
        ? prev.filter((ex) => ex !== exercise)
        : [...prev, exercise]
    );
  };

 const handleSave = async () => {
  if (!selectedLimb || selectedExercises.length === 0) return;

  try {
    const sessionsRef = ref(database, 'therapy_checklist');
    const newSessionRef = push(sessionsRef);
    
    await set(newSessionRef, {
      limb: selectedLimb,
      exercises: selectedExercises,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString(),
      patientId: "patient_123",
      status: sessionStatus
    });
    
    setBookedTherapy(`${selectedLimb} → ${selectedExercises.join(", ")}`);
    alert(`✅ Saved to therapy_checklist with status: ${sessionStatus}`);
  } catch (err) {
    console.error("Error saving:", err);
    alert("❌ Error saving to database");
  }
};

  if (loading) {
    return <div className="loading">Loading exercises...</div>;
  }

  return (
    <div className="container">
      <h2 className="title">🏥 Therapy Checklist</h2>

      {/* Limb selection as checklist in a box */}
      <div className="limbBox">
        <label className="boxLabel">Select a limb for therapy:</label>
        <div className="checklistContainer">
          {limbOptions.map((limb) => (
            <div key={limb} className="checklistItem">
              <input
                type="checkbox"
                id={limb}
                checked={selectedLimb === limb}
                onChange={() => handleLimbChange(limb)}
                className="checkbox"
              />
              <label
                htmlFor={limb}
                className={`checkboxLabel ${selectedLimb === limb ? "selectedLabel" : ""}`}
              >
                {limb}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Exercise selection */}
      {selectedLimb && (
        <div className="exerciseBox">
          <label className="exerciseLabel">🏋️ Exercises for {selectedLimb}:</label>
          <div className="checklistContainer">
            {currentExercises.length > 0 ? (
              currentExercises.map((ex) => (
                <div key={ex} className="checklistItem">
                  <input
                    type="checkbox"
                    id={ex}
                    checked={selectedExercises.includes(ex)}
                    onChange={() => handleExerciseChange(ex)}
                    className="checkbox"
                  />
                  <label
                    htmlFor={ex}
                    className={`checkboxLabel ${selectedExercises.includes(ex) ? "selectedLabel" : ""}`}
                  >
                    {ex}
                  </label>
                </div>
              ))
            ) : (
              <p className="emptyText">No exercises found. Add exercises in the Exercise Library.</p>
            )}
          </div>
        </div>
      )}

      {/* Display selection */}
      {selectedExercises.length > 0 && (
        <div className="resultBox">
          <p className="resultText">
            ✅ Selected therapy: <b>{selectedLimb}</b> → <b>{selectedExercises.join(", ")}</b>
          </p>
        </div>
      )}

      {selectedExercises.length > 0 && (
        <div className="buttonWrapper">
          <button
            onClick={handleSave}
            className="bookButton"
            style={{ padding: "18px 32px", fontSize: "20px" }}
          >
            Start Therapy
          </button>
        </div>
      )}
    </div>
  );
}



export default TherapyChecklist;