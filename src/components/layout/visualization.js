import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { useAuth } from '../auth/AuthContext';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import './visualization.css';

const LIMB_CONFIG = {
  upper_left:  { label: 'Left Arm',  seg1: 'Upper Arm', seg2: 'Forearm', icon: '🦾', color: '#00c2ff' },
  upper_right: { label: 'Right Arm', seg1: 'Upper Arm', seg2: 'Forearm', icon: '🦾', color: '#00c2ff' },
  lower_left:  { label: 'Left Leg',  seg1: 'Thigh',     seg2: 'Shin',    icon: '🦵', color: '#00ffb3' },
  lower_right: { label: 'Right Leg', seg1: 'Thigh',     seg2: 'Shin',    icon: '🦵', color: '#00ffb3' },
};

const MAX_POINTS = 30;

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function accelToAngle(ax, ay, az) { return Math.atan2(ay, az) * (180 / Math.PI); }
function flexToAngle(raw) {
  const normalized = clamp(raw, 0, 4095) / 4095;
  return (normalized - 0.5) * 120;
}

export default function VisualizationPage({ onPageChange }) {
  const { currentUser } = useAuth();
  const [selectedLimb, setSelectedLimb] = useState('upper_left');
  const [sensorData, setSensorData] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [recording, setRecording] = useState([]);
  const [ending, setEnding] = useState(false);
  const canvasRef = useRef(null);
  const recordingRef = useRef([]);

  const limb = LIMB_CONFIG[selectedLimb];

  // Listen for active session
  useEffect(() => {
    if (!currentUser) return;
    const sessionRef = ref(database, `active_session/${currentUser.uid}`);
    const unsub = onValue(sessionRef, (snap) => {
      const data = snap.val();
      setActiveSession(data);
    });
    return () => unsub();
  }, [currentUser]);

  // Listen for sensor data
  useEffect(() => {
    const sensorsRef = ref(database, '/sensors');
    const unsub = onValue(sensorsRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      setConnected(true);
      setSensorData(data);

      const point = {
        t: Date.now(),
        imu1_ax: data.imu1?.ax ?? 0,
        imu1_ay: data.imu1?.ay ?? 0,
        imu2_ax: data.imu2?.ax ?? 0,
        imu2_ay: data.imu2?.ay ?? 0,
        fsr: data.fsr?.raw ?? 0,
        flex: data.flex?.raw ?? 0,
        emg: data.emg?.raw ?? 0,
      };

      setHistory(prev => {
        const next = [...prev, point];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });

      // Record data if session active
      if (activeSession?.status === 'active') {
        recordingRef.current = [...recordingRef.current, { ...point, emg: data.emg?.raw ?? 0 }];
      }
    }, () => setConnected(false));
    return () => unsub();
  }, [activeSession]);

  // Draw limb diagram
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sensorData) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const imu1Active = sensorData.imu1?.ax !== 0 || sensorData.imu1?.ay !== 0;
    let seg1AngleDeg;
    if (imu1Active) {
      seg1AngleDeg = accelToAngle(sensorData.imu1?.ax ?? 0, sensorData.imu1?.ay ?? 0, sensorData.imu1?.az ?? 16384);
    } else {
      seg1AngleDeg = flexToAngle(sensorData.flex?.raw ?? 2048);
    }
    const seg1Angle = clamp(seg1AngleDeg, -90, 90) * (Math.PI / 180);

    const angle2Raw = accelToAngle(sensorData.imu2?.ax ?? 0, sensorData.imu2?.ay ?? 0, sensorData.imu2?.az ?? 16384);
    const seg2Angle = clamp(angle2Raw, -90, 90) * (Math.PI / 180);

    const segLen = 90;
    const startX = W / 2;
    const startY = 70;
    const x1 = startX + Math.sin(seg1Angle) * segLen;
    const y1 = startY + Math.cos(seg1Angle) * segLen;
    const x2 = x1 + Math.sin(seg1Angle + seg2Angle) * segLen;
    const y2 = y1 + Math.cos(seg1Angle + seg2Angle) * segLen;

    const accentColor = limb.color;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 18;

    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(x1, y1);
    ctx.strokeStyle = accentColor; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();

    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = accentColor + 'cc'; ctx.lineWidth = 8; ctx.stroke();

    ctx.shadowBlur = 0;
    [[startX, startY], [x1, y1], [x2, y2]].forEach(([jx, jy], i) => {
      ctx.beginPath(); ctx.arc(jx, jy, i === 0 ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#fff' : accentColor; ctx.fill();
    });

    const totalAngle = Math.abs(Math.round(seg1AngleDeg + angle2Raw));
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = accentColor;
    ctx.fillText(`${totalAngle}°`, x2 + 10, y2);
  }, [sensorData, selectedLimb, limb.color]);

  const handleEndSession = async () => {
    if (!activeSession || !currentUser) return;
    setEnding(true);

    try {
      const userId = currentUser.uid;
      const snapshots = recordingRef.current;

      // Calculate summary stats
      const flexAngles = snapshots.map(s => Math.round(flexToAngle(s.flex) + 60));
      const fsrValues = snapshots.map(s => s.fsr);
      const maxFlex = Math.max(...flexAngles);
      const minFlex = Math.min(...flexAngles);
      const avgFsr = Math.round(fsrValues.reduce((a, b) => a + b, 0) / (fsrValues.length || 1));

      const sessionData = {
        ...activeSession,
        endTime: Date.now(),
        duration: Math.round((Date.now() - activeSession.startTime) / 1000),
        snapshots: snapshots.slice(-20), // save last 20 snapshots
        summary: {
          maxFlexAngle: maxFlex,
          minFlexAngle: minFlex,
          rangeOfMotion: maxFlex - minFlex,
          avgPressure: avgFsr,
          totalSnapshots: snapshots.length,
        },
        sensors: snapshots.length > 0 ? {
          imu1: { ax: snapshots[snapshots.length-1].imu1_ax, ay: snapshots[snapshots.length-1].imu1_ay },
          imu2: { ax: snapshots[snapshots.length-1].imu2_ax, ay: snapshots[snapshots.length-1].imu2_ay },
          fsr: { raw: snapshots[snapshots.length-1].fsr },
          flex: { raw: snapshots[snapshots.length-1].flex },
        } : {}
      };

      // Save to sessions
      await set(push(ref(database, `sessions/${userId}`)), sessionData);

      // Clear active session
      await remove(ref(database, `active_session/${userId}`));

      recordingRef.current = [];
      onPageChange('history');
    } catch (err) {
      console.error("Error ending session:", err);
      alert("❌ Error saving session");
    } finally {
      setEnding(false);
    }
  };

  const fsrLabel = sensorData?.fsr?.label ?? 'none';
  const fsrRaw = sensorData?.fsr?.raw ?? 0;
  const flexRaw = sensorData?.flex?.raw ?? 0;
  const emgRaw = sensorData?.emg?.raw ?? 0;
  const emgVoltage = sensorData?.emg?.voltage ?? 0;
  const fsrPercent = Math.min(100, (fsrRaw / 4095) * 100);
  const flexPercent = Math.min(100, (flexRaw / 4095) * 100);
  const emgPercent = Math.min(100, (emgRaw / 4095) * 100);
  const flexAngle = Math.round(flexToAngle(flexRaw) + 60);

  return (
    <div className="viz-page">
      <div className="viz-header">
        <div className="viz-title">
          <h2>Live Visualization</h2>
          <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}>
            <span className="pulse-dot" />
            {connected ? 'Live' : 'Disconnected'}
          </div>
          {activeSession?.status === 'active' && (
            <div className="recording-badge">
              <span className="pulse-dot" />
              🔴 Recording — {activeSession.limb}
            </div>
          )}
        </div>

        <div className="viz-header-right">
          {activeSession?.status === 'active' && (
            <button className="end-session-btn" onClick={handleEndSession} disabled={ending}>
              {ending ? 'Saving...' : '⏹ End Session'}
            </button>
          )}
          <div className="limb-selector">
            {Object.entries(LIMB_CONFIG).map(([key, cfg]) => (
              <button key={key} className={`limb-btn ${selectedLimb === key ? 'active' : ''}`}
                onClick={() => setSelectedLimb(key)}>
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="viz-grid">
        <div className="viz-card diagram-card">
          <div className="card-label">Limb Diagram — {limb.label}</div>
          <div className="segment-labels">
            <span style={{ color: limb.color }}>● {limb.seg1} (IMU1)</span>
            <span style={{ color: limb.color + 'aa' }}>● {limb.seg2} (IMU2)</span>
          </div>
          <canvas ref={canvasRef} width={220} height={280} className="limb-canvas" />
          <div className="angle-readout" style={{ color: limb.color }}>Joint angle: {flexAngle}°</div>
        </div>

        <div className="viz-card sensors-card">
          <div className="card-label">Pressure & Flex</div>
          <div className="sensor-row">
            <div className="sensor-name">Pressure</div>
            <div className="sensor-bar-wrap">
              <div className="sensor-bar" style={{ width: `${fsrPercent}%`, background: '#ff6b6b' }} />
            </div>
            <div className="sensor-val">{fsrRaw}</div>
          </div>
          <div className="fsr-label-badge" style={{
            background: fsrLabel === 'none' ? '#333' : fsrLabel === 'light_touch' ? '#2d6a4f' :
              fsrLabel === 'light' ? '#40916c' : fsrLabel === 'medium' ? '#f4a261' : '#e63946'
          }}>{fsrLabel.replace('_', ' ')}</div>

          <div className="sensor-row" style={{ marginTop: '20px' }}>
            <div className="sensor-name">Flex</div>
            <div className="sensor-bar-wrap">
              <div className="sensor-bar" style={{ width: `${flexPercent}%`, background: '#00c2ff' }} />
            </div>
            <div className="sensor-val">{flexRaw}</div>
          </div>

          <div className="sensor-row" style={{ marginTop: '12px' }}>
            <div className="sensor-name">EMG</div>
            <div className="sensor-bar-wrap">
              <div className="sensor-bar" style={{ width: `${emgPercent}%`, background: '#a855f7' }} />
            </div>
            <div className="sensor-val">{emgRaw}</div>
          </div>
          <div className="fsr-label-badge" style={{ background: '#3b1f5e', color: '#c084fc', marginTop: 4 }}>
            {emgVoltage.toFixed(3)}V — {emgRaw < 100 ? 'No activation' : emgRaw < 800 ? 'Low activity' : emgRaw < 2500 ? 'Moderate' : 'High activity'}
          </div>

          <div className="imu-raw">
            <div className="imu-raw-title" style={{ color: limb.color }}>{limb.seg1} (IMU1)</div>
            <div className="imu-vals">
              <span>ax: {sensorData?.imu1?.ax ?? '—'}</span>
              <span>ay: {sensorData?.imu1?.ay ?? '—'}</span>
              <span>az: {sensorData?.imu1?.az ?? '—'}</span>
            </div>
            <div className="imu-raw-title" style={{ color: limb.color + 'aa', marginTop: 8 }}>{limb.seg2} (IMU2)</div>
            <div className="imu-vals">
              <span>ax: {sensorData?.imu2?.ax ?? '—'}</span>
              <span>ay: {sensorData?.imu2?.ay ?? '—'}</span>
              <span>az: {sensorData?.imu2?.az ?? '—'}</span>
            </div>
          </div>

          {activeSession?.status === 'active' && (
            <div className="session-info">
              <div className="session-info-title">📋 Current Session</div>
              <div className="session-info-item"><strong>Limb:</strong> {activeSession.limb}</div>
              <div className="session-info-item"><strong>Exercises:</strong> {activeSession.exercises?.join(', ')}</div>
              <div className="session-info-item"><strong>Snapshots:</strong> {recordingRef.current.length}</div>
            </div>
          )}
        </div>

        <div className="viz-card chart-card">
          <div className="card-label">{limb.seg1} — Acceleration (IMU1)</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history}>
              <XAxis dataKey="t" hide />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#888', fontSize: 10 }} width={35} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 11 }} labelFormatter={() => ''} />
              <Line type="monotone" dataKey="imu1_ax" stroke={limb.color} dot={false} strokeWidth={2} name="ax" />
              <Line type="monotone" dataKey="imu1_ay" stroke="#ff6b6b" dot={false} strokeWidth={2} name="ay" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="viz-card chart-card">
          <div className="card-label">{limb.seg2} — Acceleration (IMU2)</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history}>
              <XAxis dataKey="t" hide />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#888', fontSize: 10 }} width={35} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 11 }} labelFormatter={() => ''} />
              <Line type="monotone" dataKey="imu2_ax" stroke={limb.color + 'cc'} dot={false} strokeWidth={2} name="ax" />
              <Line type="monotone" dataKey="imu2_ay" stroke="#00ffb3" dot={false} strokeWidth={2} name="ay" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="viz-card chart-card wide-card">
          <div className="card-label">Pressure & Flex — History</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 4095]} tick={{ fill: '#888', fontSize: 10 }} width={40} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 11 }} labelFormatter={() => ''} />
              <Line type="monotone" dataKey="fsr" stroke="#ff6b6b" dot={false} strokeWidth={2} name="Pressure" />
              <Line type="monotone" dataKey="flex" stroke="#00c2ff" dot={false} strokeWidth={2} name="Flex" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="viz-card chart-card wide-card">
          <div className="card-label">EMG — Muscle Activity History</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 4095]} tick={{ fill: '#888', fontSize: 10 }} width={40} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 11 }} labelFormatter={() => ''} />
              <Line type="monotone" dataKey="emg" stroke="#a855f7" dot={false} strokeWidth={2} name="EMG" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}