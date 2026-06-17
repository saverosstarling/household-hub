// This file connects our page to our Firebase project.
// Other files will later import "db" and "auth" from here whenever they need
// to read/write data or check who's signed in.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Copied straight from your Firebase console.
const firebaseConfig = {
  apiKey: "AIzaSyAwgbaINyCBke3__ESr5LyoGaiBDHyfVPs",
  authDomain: "home-hub-76ff0.firebaseapp.com",
  projectId: "home-hub-76ff0",
  storageBucket: "home-hub-76ff0.firebasestorage.app",
  messagingSenderId: "1006612363765",
  appId: "1:1006612363765:web:9a53736c916a473c58c8bc"
};

const app = initializeApp(firebaseConfig);

// "db" = our database connection, "auth" = who's currently signed in.
// We export both so other files (the Diet tracker, Budget tracker, etc.)
// can grab them later without re-connecting from scratch.
export const db = getFirestore(app);
export const auth = getAuth(app);

// The moment the page loads, sign in anonymously — no form, no password.
signInAnonymously(auth).catch((error) => {
  console.error("Sign-in failed:", error);
});

// This runs automatically whenever the sign-in status changes.
onAuthStateChanged(auth, (user) => {
  const statusEl = document.getElementById('connection-status');
  if (user) {
    console.log("Connected to Firebase. Anonymous user ID:", user.uid);
    if (statusEl) statusEl.textContent = "Connected ✓";
  } else {
    console.log("Not signed in yet.");
    if (statusEl) statusEl.textContent = "Not connected";
  }
});
