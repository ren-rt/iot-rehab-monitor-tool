import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebase/config';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import './visualization.css';

const LIMB_CONFIG = {
  upper_left:  { label: 'Left Arm',  seg1: 'Upper Arm', seg2: 'Forearm', icon: '🦾', color: '#00c2ff' },
  upper_right: { label: 'Right Arm', seg1: 'Upper Arm', seg2: 'Forearm', icon: '🦾', color: '#00c2ff' },
  lower_left:  { label: 'Left Leg',  seg1: 'Thigh',     seg2: 'Shin',    icon: '🦵', color: '#00ffb3' },
  lower_right: { label: 'Right Leg', seg1: 'Thigh',     seg2: 'Shin',    icon: '🦵', color: '#00ffb3' },
};

const MAX_POINTS = 60;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function accelToAngle(ax, ay, az) {
  return Math.atan2(ay, az) * (180 / Math.PI);
}

function flexToAngle(raw) {
  const normalized = clamp(raw, 0, 4095) / 4095;
  return (normalized - 0.5) * 120;
}

function computeDomain(history, keys, padRatio = 0.06, minClamp = null) {
  if (!history || history.length === 0) return ['auto', 'auto'];
  const vals = [];
  history.forEach(pt => {
    keys.forEach(k => {
      const v = pt[k];
      if (v !== undefined && v !== null) vals.push(v);
    });
  });
  if (vals.length === 0) return ['auto', 'auto'];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(1, max - min);
  const pad = range * padRatio;
  const low = minClamp !== null ? Math.max(minClamp, min - pad) : (min - pad);
  const high = max + pad;
  return [low, high];
}

export default function VisualizationPage() {
  const [selectedLimb, setSelectedLimb] = useState('upper_left');
  const [sensorData, setSensorData] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const canvasRef = useRef(null);

  const limb = LIMB_CONFIG[selectedLimb];

  useEffect(() => {
    const sensorsRef = ref(database, '/sensors');
    const unsub = onValue(sensorsRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      setConnected(true);
      setSensorData(data);
      setHistory(prev => {
        const point = {
          t: Date.now(),
          imu1_ax: data.imu1?.ax ?? 0,
          imu1_ay: data.imu1?.ay ?? 0,
          imu2_ax: data.imu2?.ax ?? 0,
          imu2_ay: data.imu2?.ay ?? 0,
          fsr: data.fsr?.raw ?? 0,
          flex: data.flex?.raw ?? 0,
        };
        const next = [...prev, point];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });
    }, () => setConnected(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sensorData) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Segment 1 from IMU1, fallback to flex if IMU1 is 0
    const imu1Active = sensorData.imu1?.ax !== 0 || sensorData.imu1?.ay !== 0;
    let seg1AngleDeg;
    if (imu1Active) {
      seg1AngleDeg = accelToAngle(
        sensorData.imu1?.ax ?? 0,
        sensorData.imu1?.ay ?? 0,
        sensorData.imu1?.az ?? 16384
      );
    } else {
      seg1AngleDeg = flexToAngle(sensorData.flex?.raw ?? 2048);
    }
    const seg1Angle = clamp(seg1AngleDeg, -90, 90) * (Math.PI / 180);

    // Segment 2 from IMU2
    const angle2Raw = accelToAngle(
      sensorData.imu2?.ax ?? 0,
      sensorData.imu2?.ay ?? 0,
      sensorData.imu2?.az ?? 16384
    );
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

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = accentColor + 'cc';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.shadowBlur = 0;

    [[startX, startY], [x1, y1], [x2, y2]].forEach(([jx, jy], i) => {
      ctx.beginPath();
      ctx.arc(jx, jy, i === 0 ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#fff' : accentColor;
      ctx.fill();
    });

    const totalAngle = Math.abs(Math.round(seg1AngleDeg + angle2Raw));
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = accentColor;
    ctx.fillText(`${totalAngle}°`, x2 + 10, y2);

  }, [sensorData, selectedLimb, limb.color]);

  const fsrLabel = sensorData?.fsr?.label ?? 'none';
  const fsrRaw = sensorData?.fsr?.raw ?? 0;
  const flexRaw = sensorData?.flex?.raw ?? 0;
  const fsrPercent = Math.min(100, (fsrRaw / 4095) * 100);
  const flexPercent = Math.min(100, (flexRaw / 4095) * 100);
  const flexAngle = Math.round(flexToAngle(flexRaw) + 60);

  // dynamic domains for tighter, more sensitive charts
  const imu1Domain = computeDomain(history, ['imu1_ax', 'imu1_ay'], 0.08);
  const imu2Domain = computeDomain(history, ['imu2_ax', 'imu2_ay'], 0.08);
  const pfDomain = computeDomain(history, ['fsr', 'flex'], 0.03, 0);

  return (
    <div className="viz-page">
      <div className="viz-header">
        <div className="viz-title">
          <h2>Live Visualization</h2>
          <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}>
            <span className="pulse-dot" />
            {connected ? 'Live' : 'Disconnected'}
          </div>
        </div>

        <div className="limb-selector">
          {Object.entries(LIMB_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              className={`limb-btn ${selectedLimb === key ? 'active' : ''}`}
              onClick={() => setSelectedLimb(key)}
            >
              {cfg.icon} {cfg.label}
            </button>
          ))}
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
          <div className="angle-readout" style={{ color: limb.color }}>
            Flex angle: {flexAngle}°
          </div>
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
            background: fsrLabel === 'none' ? '#333' :
                        fsrLabel === 'light_touch' ? '#2d6a4f' :
                        fsrLabel === 'light' ? '#40916c' :
                        fsrLabel === 'medium' ? '#f4a261' : '#e63946'
          }}>
            {fsrLabel.replace('_', ' ')}
          </div>

          <div className="sensor-row" style={{ marginTop: '20px' }}>
            <div className="sensor-name">Flex</div>
            <div className="sensor-bar-wrap">
              <div className="sensor-bar" style={{ width: `${flexPercent}%`, background: '#00c2ff' }} />
            </div>
            <div className="sensor-val">{flexRaw}</div>
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
        </div>

        <div className="viz-card chart-card">
          <div className="card-label">{limb.seg1} — Acceleration (IMU1)</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history} isAnimationActive={false}>
              <XAxis dataKey="t" hide />
              <YAxis domain={imu1Domain} tick={{ fill: '#888', fontSize: 10 }} width={35} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 11 }} labelFormatter={() => ''} />
              <Line type="linear" dataKey="imu1_ax" stroke={limb.color} dot={{ r: 1 }} strokeWidth={1.2} name="ax" isAnimationActive={false} />
              <Line type="linear" dataKey="imu1_ay" stroke="#ff6b6b" dot={{ r: 1 }} strokeWidth={1.2} name="ay" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="viz-card chart-card">
          <div className="card-label">{limb.seg2} — Acceleration (IMU2)</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history} isAnimationActive={false}>
              <XAxis dataKey="t" hide />
              <YAxis domain={imu2Domain} tick={{ fill: '#888', fontSize: 10 }} width={35} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 11 }} labelFormatter={() => ''} />
              <Line type="linear" dataKey="imu2_ax" stroke={limb.color + 'cc'} dot={{ r: 1 }} strokeWidth={1.2} name="ax" isAnimationActive={false} />
              <Line type="linear" dataKey="imu2_ay" stroke="#00ffb3" dot={{ r: 1 }} strokeWidth={1.2} name="ay" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="viz-card chart-card wide-card">
          <div className="card-label">Pressure & Flex — History</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history} isAnimationActive={false}>
              <XAxis dataKey="t" hide />
              <YAxis domain={pfDomain} tick={{ fill: '#888', fontSize: 10 }} width={40} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 11 }} labelFormatter={() => ''} />
              <Line type="linear" dataKey="fsr" stroke="#ff6b6b" dot={{ r: 1 }} strokeWidth={1.2} name="Pressure" isAnimationActive={false} />
              <Line type="linear" dataKey="flex" stroke="#00c2ff" dot={{ r: 1 }} strokeWidth={1.2} name="Flex" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}