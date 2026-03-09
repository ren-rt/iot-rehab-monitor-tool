// src/components/TherapyChecklist.jsx
import React, { useState } from "react";
import { database } from "../firebase"; // This should export RTDB, not Firestore!
import { ref, push, set } from "firebase/database";

const exercises = {
  "Right Arm": ["Wrist Flexion", "Elbow Curl", "Shoulder Raise"],
  "Left Arm": ["Wrist Flexion", "Elbow Curl", "Shoulder Raise"],
  "Right Leg": ["Knee Extension", "Ankle Circles", "Leg Raises"],
  "Left Leg": ["Knee Extension", "Ankle Circles", "Leg Raises"]
};

function TherapyChecklist() {
  const [selectedLimb, setSelectedLimb] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [bookedTherapy, setBookedTherapy] = useState("");
   const [sessionStatus, setSessionStatus] = useState("pending"); // "pending", "active", "paused", "completed"
  const limbOptions = ["Right Arm", "Left Arm", "Right Leg", "Left Leg"];

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
      // ✅ Use the current status instead of hardcoded "active"
      status: sessionStatus  // This will be "pending" initially
    });
    
    setBookedTherapy(`${selectedLimb} → ${selectedExercises.join(", ")}`);
    alert(`✅ Saved to therapy_checklist with status: ${sessionStatus}`);
  } catch (err) {
    console.error("Error saving:", err);
    alert("❌ Error saving to database");
  }
};

  // ... rest of your component (UI remains exactly the same)

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏥 Therapy Checklist</h2>

      {/* Limb selection as checklist in a box */}
      <div style={styles.limbBox}>
        <label style={styles.boxLabel}>Select a limb for therapy:</label>
        <div style={styles.checklistContainer}>
          {limbOptions.map((limb) => (
            <div key={limb} style={styles.checklistItem}>
              <input
                type="checkbox"
                id={limb}
                checked={selectedLimb === limb}
                onChange={() => handleLimbChange(limb)}
                style={styles.checkbox}
              />
              <label
                htmlFor={limb}
                style={{
                  ...styles.checkboxLabel,
                  ...(selectedLimb === limb ? styles.selectedLabel : {})
                }}
              >
                {limb}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Exercise selection */}
      {selectedLimb && (
        <div style={styles.exerciseBox}>
          <label style={styles.exerciseLabel}>🏋️ Exercises for {selectedLimb}:</label>
          <div style={styles.checklistContainer}>
            {exercises[selectedLimb].map((ex) => (
              <div key={ex} style={styles.checklistItem}>
                <input
                  type="checkbox"
                  id={ex}
                  checked={selectedExercises.includes(ex)}
                  onChange={() => handleExerciseChange(ex)}
                  style={styles.checkbox}
                />
                <label
                  htmlFor={ex}
                  style={{
                    ...styles.checkboxLabel,
                    ...(selectedExercises.includes(ex) ? styles.selectedLabel : {})
                  }}
                >
                  {ex}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display selection */}
      {selectedExercises.length > 0 && (
        <div style={styles.resultBox}>
          <p style={styles.resultText}>
            ✅ Selected therapy: <b>{selectedLimb}</b> → <b>{selectedExercises.join(", ")}</b>
          </p>
        </div>
      )}

      {selectedExercises.length > 0 && (
        <div style={styles.buttonWrapper}>
          <button
            onClick={handleSave}
            style={{ ...styles.bookButton, padding: "18px 32px", fontSize: "20px" }}
          >
            Start Therapy
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: "900px",
    margin: "30px auto",
    padding: "42px",
    border: "none",
    borderRadius: "14px",
    background: "#f0f4f2",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
    display: "flex",
    flexDirection: "column"
  },
  title: {
    color: "#2d5a4d",
    textAlign: "center",
    marginBottom: "28px",
    fontSize: "30px",
    fontWeight: "700",
    letterSpacing: "0.2px"
  },
  limbBox: {
    marginBottom: "20px",
    padding: "20px",
    border: "1px solid #a8c8ba",
    borderRadius: "12px",
    background: "#ffffff",
    boxShadow: "0 2px 8px rgba(45, 90, 77, 0.08)"
  },
  boxLabel: {
    display: "block",
    marginBottom: "12px",
    fontWeight: "700",
    color: "#111827",
    fontSize: "16px"
  },
  checklistContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  checklistItem: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "10px",
    transition: "background-color 0.15s ease",
    cursor: "pointer",
    background: "#ffffff",
    border: "1px solid #c8dfd3"
  },
  checkbox: {
    width: "22px",
    height: "22px",
    cursor: "pointer",
    accentColor: "#4a9d7f"
  },
  checkboxLabel: {
    marginLeft: "12px",
    cursor: "pointer",
    userSelect: "none",
    fontSize: "15px",
    color: "#0f1724",
    fontWeight: "600",
    transition: "color 0.15s ease"
  },
  selectedLabel: {
    color: "#334155",
    fontWeight: "700"
  },
  exerciseBox: {
    marginBottom: "18px",
    padding: "20px",
    border: "1px solid #a8c8ba",
    borderRadius: "12px",
    background: "#ffffff",
    boxShadow: "0 2px 8px rgba(45, 90, 77, 0.08)",
    minHeight: "110px"
  },
  exerciseLabel: {
    display: "block",
    marginBottom: "12px",
    fontWeight: "700",
    color: "#0f1724",
    fontSize: "16px"
  },
  select: {
    width: "100%",
    padding: "12px",
    border: "1px solid #a8c8ba",
    borderRadius: "10px",
    fontSize: "15px",
    fontFamily: "inherit",
    backgroundColor: "#fff",
    color: "#0f1724",
    cursor: "pointer",
    transition: "border-color 0.18s ease, boxShadow 0.18s ease",
    boxSizing: "border-box"
  },
  resultBox: {
    padding: "22px",
    border: "1px solid #a8c8ba",
    borderRadius: "12px",
    background: "#ffffff",
    boxShadow: "0 2px 8px rgba(45, 90, 77, 0.08)",
    marginBottom: "16px",
    textAlign: "center"
  },
  resultText: {
    fontSize: "22px",
    color: "#0f1724",
    margin: "0",
    fontWeight: "700"
  },
  buttonWrapper: {
    display: "flex",
    justifyContent: "center",
    marginTop: "12px",
    marginBottom: "20px"
  },
  bookButton: {
    marginTop: 6,
    padding: "12px 22px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#0f1724",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "transform 0.12s ease, opacity 0.12s ease",
    minWidth: "220px"
  },
  bookButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    transform: "none"
  },
  bookedBox: {
    marginTop: "16px",
    padding: "16px",
    borderRadius: "10px",
    background: "#ffffff",
    border: "1px solid #a8c8ba",
    boxShadow: "0 2px 8px rgba(45, 90, 77, 0.08)"
  },
  bookedText: {
    margin: 0,
    color: "#0f1724",
    fontSize: "18px",
    fontWeight: "700"
  }
};

export default TherapyChecklist;