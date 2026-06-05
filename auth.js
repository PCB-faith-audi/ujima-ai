import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔥 YOUR FIREBASE CONFIG (from console)
const firebaseConfig = {
  apiKey: "AIzaSyB0jCZ5g5vnCKI3ihbeSCmfbHZELQtbvIQ",
  authDomain: "ujima-ai-c3c48.firebaseapp.com",
  projectId: "ujima-ai-c3c48",
  storageBucket: "ujima-ai-c3c48.firebasestorage.app",
  messagingSenderId: "711296977200",
  appId: "1:711296977200:web:9b8065b33cace5562e20f5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export async function register(email, password) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  return userCredential.user;
}

export async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  const token = await userCredential.user.getIdToken();
  localStorage.setItem("token", token);

  return userCredential.user;
}

export { auth, onAuthStateChanged };