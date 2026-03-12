import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password, userDetails) {
    try {
      // 1. Create user in Firebase Authentication
      console.log('Attempting to create user in Auth...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created in Auth, UID:', user.uid);
      console.log('AuthContext.register userDetails received:', userDetails);

      // 2. Save ALL patient details to Realtime Database
      const userRef = ref(database, 'users/' + user.uid);
      console.log('Attempting to write to RTDB at path:', userRef.toString());

      await set(userRef, {
        email: email,
        name: userDetails.name || '',
        age: userDetails.age || '',
        gender: userDetails.gender || '',
        role: userDetails.role || 'patient',
        registeredAt: new Date().toISOString(),
        userId: user.uid
      });

      console.log('Successfully wrote user data to Realtime Database!');
      return user;
    } catch (error) {
      console.error('Error in AuthContext register function:', error);
      throw error;
    }
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}