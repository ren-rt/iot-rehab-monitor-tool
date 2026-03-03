import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import './register.css';

export default function RegisterModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const { register } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      setError('');
      setLoading(true);
      // debug: log what will be sent to AuthContext.register
      console.log('register submit', { email, name: fullName, age, gender });
      // include additional profile fields when registering
      await register(email, password, {
        name: fullName,
        age,
        gender,
        role: 'patient'
      });

      
      onClose(); // close modal on success – user is automatically logged in
      // The app will redirect to dashboard because AuthContext updates currentUser
    } catch (err) {
      console.error('register error', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Create Patient Account</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password (min 6 characters)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              min="0"
            />
          </div>
         <div className="form-group">
            <label>gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="male"> Male</option>
              <option value="female"> Female</option> 
            </select>
          </div>

          <div className="form-group">
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
    
  );
}
