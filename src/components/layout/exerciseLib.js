import React, { useState, useEffect } from "react";
import { database } from "../../firebase/config";
import { ref, push, set, onValue, remove } from "firebase/database";
import './exerciseLib.css';

function ExerciseLibrary() {
  // group-side state: each button toggles side when clicked
  const [handSide, setHandSide] = useState("Right");
  const [legSide, setLegSide] = useState("Right");
  const [selectedGroup, setSelectedGroup] = useState("hand"); // "hand" or "leg"
  const [exercises, setExercises] = useState({});
  const [newExercise, setNewExercise] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(true);

  // editing existing exercise
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // compute current limb id and label
  const currentLimbId = selectedGroup === "hand" ? `${handSide.toLowerCase()}_hand` : `${legSide.toLowerCase()}_leg`;
  const currentLimbLabel = selectedGroup === "hand" ? `${handSide} Hand` : `${legSide} Leg`;
  const exercisePlaceholder = selectedGroup === "hand" ? "Exercise name (e.g., Arm Raises)" : "Exercise name (e.g., Knee Extension)";


  // Load exercises from Firebase
  useEffect(() => {
    const exercisesRef = ref(database, 'exercise_library');
    
    onValue(exercisesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setExercises(data);
      } else {
        // Initialize empty structure if none exists
        const initialData = {
          right_hand: {},
          left_hand: {},
          right_leg: {},
          left_leg: {}
        };
        setExercises(initialData);
      }
      setLoading(false);
    });
  }, []);

  // Add new exercise
  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (!newExercise.trim()) return;

    try {
      const exercisesRef = ref(database, `exercise_library/${currentLimbId}`);
      const newExerciseRef = push(exercisesRef);
      
      await set(newExerciseRef, {
        name: newExercise,
        description: newDescription || "No description",
        createdAt: Date.now()
      });

      // Clear form
      setNewExercise("");
      setNewDescription("");
      alert("✅ Exercise added!");
    } catch (err) {
      console.error("Error adding exercise:", err);
      alert("❌ Failed to add exercise");
    }
  };

  // Delete exercise
  const handleDeleteExercise = async (exerciseId) => {
    if (window.confirm("Delete this exercise?")) {
      try {
        const exerciseRef = ref(database, `exercise_library/${currentLimbId}/${exerciseId}`);
        await remove(exerciseRef);
      } catch (err) {
        console.error("Error deleting:", err);
      }
    }
  };

  // begin editing an exercise
  const handleEditClick = (id, exercise) => {
    setEditingId(id);
    setEditName(exercise.name);
    setEditDescription(exercise.description);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const handleUpdateExercise = async (exerciseId) => {
    if (!editName.trim()) return;
    try {
      const exerciseRef = ref(database, `exercise_library/${currentLimbId}/${exerciseId}`);
      await set(exerciseRef, {
        name: editName,
        description: editDescription || "No description",
        // preserve createdAt if it exists in local state
        createdAt: exercises[currentLimbId][exerciseId].createdAt
      });
      setEditingId(null);
      alert("✅ Exercise updated!");
    } catch (err) {
      console.error("Error updating exercise:", err);
      alert("❌ Failed to update exercise");
    }
  };

  if (loading) {
    return <div className="loading">Loading exercises...</div>;
  }

  return (
    <div className="container">
      <h2 className="title">🦾 Exercise Library</h2>

      {/* Group buttons: hands or legs */}
      <div className="groupBox">
        <button
          onClick={() => {
            if (selectedGroup === "hand") {
              setHandSide((s) => (s === "Right" ? "Left" : "Right"));
            }
            setSelectedGroup("hand");
          }}
          className={`groupButton ${selectedGroup === "hand" ? "activeGroupButton" : ""}`}
        >
          Right/Left Hand
        </button>

        <button
          onClick={() => {
            if (selectedGroup === "leg") {
              setLegSide((s) => (s === "Right" ? "Left" : "Right"));
            }
            setSelectedGroup("leg");
          }}
          className={`groupButton ${selectedGroup === "leg" ? "activeGroupButton" : ""}`}
        >
          Right/Left Leg
        </button>
      </div>

      {/* Add Exercise Form */}
      <div className="formContainer">
        <h3 className="formTitle">➕ Add New Exercise to {currentLimbLabel}</h3>
        <form onSubmit={handleAddExercise} className="form">
          <input
            type="text"
            placeholder={exercisePlaceholder}
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            className="input"
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="input"
          />
          <button type="submit" className="addButton">
            ➕ Add Exercise
          </button>
        </form>
      </div>

      {/* Exercises Table */}
      <div className="listContainer">
        <h3 className="listTitle">
          Exercises
          <span className="count">
            {exercises[currentLimbId] ? Object.keys(exercises[currentLimbId]).length : 0} exercises
          </span>
        </h3>

        {(!exercises[currentLimbId] || Object.keys(exercises[currentLimbId]).length === 0) ? (
          <div className="emptyState">
            <p>No exercises yet. Add your first exercise above! 👆</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr className="tableHeader">
                <th className="th">Exercise Name</th>
                <th className="th">Description</th>
                <th className="th">Added Date</th>
                <th className="th">Action</th>
              </tr>
            </thead>
            <tbody>
              {exercises[currentLimbId] && Object.entries(exercises[currentLimbId]).map(([id, exercise]) => (
                <tr
                  key={id}
                  className="tableRow"
                >
                  {editingId === id ? (
                    <>
                      <td className="td">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input"
                        />
                      </td>
                      <td className="td">
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="input"
                        />
                      </td>
                      <td className="td">
                        {new Date(exercise.createdAt).toLocaleDateString()}
                      </td>
                      <td className="td">
                        <button
                          onClick={() => handleUpdateExercise(id)}
                          className="saveButton"
                        >
                          💾 Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="cancelButton"
                        >
                          ✖ Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="td">
                        <strong>{exercise.name}</strong>
                      </td>
                      <td className="td">{exercise.description}</td>
                      <td className="td">
                        {new Date(exercise.createdAt).toLocaleDateString()}
                      </td>
                      <td className="td">
                        <button
                          onClick={() => handleEditClick(id, exercise)}
                          className="editButton"
                          title="Edit Exercise"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExercise(id)}
                          className="deleteButton"
                          title="Delete Exercise"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


export default ExerciseLibrary;