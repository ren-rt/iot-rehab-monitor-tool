// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your teammate's Firebase config (copy exactly)
const firebaseConfig = {
  apiKey: "AIzaSyD9dHdERJ8NnDJerfadQjcP2_nXhIqrEsE",
  authDomain: "testfirebaseapp-729a4.firebaseapp.com",
  databaseURL: "https://testfirebaseapp-729a4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "testfirebaseapp-729a4",
  storageBucket: "testfirebaseapp-729a4.appspot.com",
  messagingSenderId: "52566275652",
  appId: "1:52566275652:web:6ed3b3a4d296c38837ee11",
  measurementId: "G-C8ETTX4FWQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// This connects to YOUR TEAM's Realtime Database
export const database = getDatabase(app);