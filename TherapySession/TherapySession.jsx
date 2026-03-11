import React, { useState, useEffect } from 'react';
import { ref, push, set, update } from 'firebase/database';
import { database } from '../firebase';
import './TherapySession.css';

function TherapySession({ selectedLimb, selectedExercises, onComplete }) {
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [setsForCurrentExercise, setSetsForCurrentExercise] = useState(1);
  const [currentSet, setCurrentSet] = useState(1);
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showSetInput, setShowSetInput] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [isBreak, setIsBreak] = useState(false);
  const [breakTimer, setBreakTimer] = useState(15);

  const currentExercise = selectedExercises[currentExerciseIndex];
  const isLastExercise = currentExerciseIndex === selectedExercises.length - 1;

  // Create session in Firebase
  useEffect(() => {
    const createSession = async () => {
      try {
        const sessionsRef = ref(database, 'session_recordings');
        const newSessionRef = push(sessionsRef);
        setSessionId(newSessionRef.key);
        
        const initialData = {
          limbType: selectedLimb,
          date: new Date().toLocaleDateString(), // Add date
          createdAt: Date.now(),
          exercises: selectedExercises.map((exercise) => ({
            name: exercise,
            prescribedSets: setsForCurrentExercise,
            completedSets: 0
          }))
        };
        
        await set(newSessionRef, initialData);
        console.log("✅ Session created");
      } catch (err) {
        console.error("Error creating session:", err);
      }
    };

    if (selectedExercises && selectedExercises.length > 0) {
      createSession();
    }
  }, []);

  // Timer logic (your existing code - unchanged)
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      if (isBreak) {
        if (breakTimer > 0) {
          interval = setInterval(() => {
            setBreakTimer((prev) => prev - 1);
          }, 1000);
        } else {
          setIsBreak(false);
          setCurrentSet(currentSet + 1);
          setTimer(60);
          setIsTimerRunning(true);
        }
      } else {
        if (timer > 0) {
          interval = setInterval(() => {
            setTimer((prev) => prev - 1);
          }, 1000);
        } else {
          setIsTimerRunning(false);
          
          if (currentSet < setsForCurrentExercise) {
            setIsBreak(true);
            setBreakTimer(15);
            setIsTimerRunning(true);
          } else {
            handleExerciseComplete();
          }
        }
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer, isBreak, breakTimer, currentSet, setsForCurrentExercise]);

  const handleExerciseComplete = () => {
    const completedExercise = {
      name: currentExercise,
      setsCompleted: currentSet,
      totalSets: setsForCurrentExercise
    };
    setExerciseHistory([...exerciseHistory, completedExercise]);

    // Update Firebase with completed sets
    if (sessionId) {
      const sessionRef = ref(database, `session_recordings/${sessionId}`);
      update(sessionRef, {
        [`exercises/${currentExerciseIndex}/completedSets`]: currentSet
      });
    }

    if (isLastExercise && currentSet === setsForCurrentExercise) {
      setSessionComplete(true);
      setIsTimerRunning(false);
      setIsBreak(false);
    } else if (currentSet === setsForCurrentExercise) {
      // Move to next exercise
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
      setSetsForCurrentExercise(1);
      setTimer(60);
      setShowSetInput(true);
      setIsTimerRunning(false);
      setIsBreak(false);
    }
  };

  const handleStartExercise = () => {
    setShowSetInput(false);
    setIsTimerRunning(true);
    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }
  };

  const handleSkipToNext = () => {
    if (isBreak) {
      setIsBreak(false);
      setCurrentSet(currentSet + 1);
      setTimer(60);
      setIsTimerRunning(true);
    } else {
      if (currentSet < setsForCurrentExercise) {
        setIsBreak(true);
        setBreakTimer(15);
        setIsTimerRunning(true);
      } else {
        handleExerciseComplete();
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCompleteSession = () => {
    if (onComplete) {
      onComplete(exerciseHistory);
    }
  };

  if (sessionComplete) {
    return (
      <div className="ts-container">
        <h2 className="ts-title">🎉 Session Recording Complete!</h2>
        <div className="ts-summary-box">
          <h3 className="ts-summary-title">Exercise Summary:</h3>
          {exerciseHistory.map((item, index) => (
            <div key={index} className="ts-summary-item">
              <span className="ts-summary-exercise">{item.name}</span>
              <span className="ts-summary-sets">Completed: {item.setsCompleted}/{item.totalSets} sets</span>
            </div>
          ))}
        </div>
        <button onClick={handleCompleteSession} className="ts-complete-button">
          Return to Checklist
        </button>
      </div>
    );
  }

  if (showSetInput) {
    return (
      <div className="ts-container">
        <h2 className="ts-title">🏋️ Exercise {currentExerciseIndex + 1} of {selectedExercises.length}</h2>
        
        <div className="ts-exercise-name-box">
          <span className="ts-exercise-name">{currentExercise}</span>
        </div>

        <div className="ts-set-input-box">
          <label className="ts-set-label">How many sets for {currentExercise}?</label>
          <div className="ts-set-input-container">
            <button 
              onClick={() => setSetsForCurrentExercise(Math.max(1, setsForCurrentExercise - 1))}
              className="ts-set-button"
            >-</button>
            <input
              type="number"
              min="1"
              max="10"
              value={setsForCurrentExercise}
              onChange={(e) => setSetsForCurrentExercise(Math.max(1, parseInt(e.target.value) || 1))}
              className="ts-set-number-input"
            />
            <button 
              onClick={() => setSetsForCurrentExercise(Math.min(10, setsForCurrentExercise + 1))}
              className="ts-set-button"
            >+</button>
          </div>
          <button onClick={handleStartExercise} className="ts-start-button">
            Start Exercise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ts-container">
      <h2 className="ts-title">
        {isBreak 
          ? '😴 Break Time' 
          : `${currentExercise} - Set ${currentSet} of ${setsForCurrentExercise}`}
      </h2>

      <div className={isBreak ? 'ts-break-timer-container' : 'ts-timer-container'}>
        <div className={isBreak ? 'ts-break-timer-display' : 'ts-timer-display'}>
          {formatTime(isBreak ? breakTimer : timer)}
        </div>
        <div className={isBreak ? 'ts-break-timer-label' : 'ts-timer-label'}>
          {isBreak ? 'seconds until next set' : 'seconds remaining'}
        </div>
      </div>

      <div className="ts-progress-container">
        <div className="ts-progress-info">
          <span>Exercise {currentExerciseIndex + 1}/{selectedExercises.length}</span>
          <span>
            {isBreak 
              ? `Break after Set ${currentSet}` 
              : `Set ${currentSet}/${setsForCurrentExercise}`}
          </span>
        </div>
        <div className="ts-progress-bar">
          {!isBreak ? (
            <div className="ts-progress-fill" style={{
              width: `${(1 - timer/60) * 100}%`,
              background: 'linear-gradient(90deg, #4a9a8b, #667eea)'
            }} />
          ) : (
            <div className="ts-progress-fill" style={{
              width: `${(1 - breakTimer/15) * 100}%`,
              background: 'linear-gradient(90deg, #f39c12, #e67e22)'
            }} />
          )}
        </div>
        
        <div className="ts-set-indicators">
          {[...Array(setsForCurrentExercise)].map((_, index) => (
            <div key={index} className="ts-set-dot" style={{
              backgroundColor: index + 1 < currentSet 
                ? '#4a9a8b'
                : index + 1 === currentSet
                  ? (isBreak ? '#f39c12' : '#667eea')
                  : '#e0e0e0'
            }} />
          ))}
        </div>
      </div>

      <div className="ts-controls-container">
        {isTimerRunning ? (
          <button onClick={() => setIsTimerRunning(false)} className="ts-pause-button">
            ⏸️ Pause
          </button>
        ) : (
          <button onClick={() => setIsTimerRunning(true)} className="ts-resume-button">
            {(isBreak && breakTimer === 15) || (!isBreak && timer === 60) ? '▶️ Start' : '▶️ Resume'}
          </button>
        )}
        <button onClick={handleSkipToNext} className="ts-skip-button">
          ⏭️ Skip to {isBreak ? 'Next Set' : 'Next'}
        </button>
      </div>

      <div className="ts-reset-container">
        <button onClick={() => {
          if (isBreak) {
            setBreakTimer(15);
          } else {
            setTimer(60);
          }
          setIsTimerRunning(false);
        }} className="ts-reset-button">
          🔄 Reset Timer
        </button>
      </div>

      {isBreak && (
        <div className="ts-break-message">
          Great job on Set {currentSet}! Take a 15-second break before Set {currentSet + 1}.
        </div>
      )}
    </div>
  );
}

export default TherapySession;
