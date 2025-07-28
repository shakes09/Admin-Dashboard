// login.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAL6BpwuISkU12T3stp6bemVgt6CL0GMPk",
  authDomain: "linvaro-shop.firebaseapp.com",
  databaseURL: "https://linvaro-shop-default-rtdb.firebaseio.com/",
  projectId: "linvaro-shop",
  storageBucket: "linvaro-shop.appspot.com",
  messagingSenderId: "1088432356268",
  appId: "1:1088432356268:web:24523319f1928c1a395809",
  measurementId: "G-90599SM75H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// List of allowed admin emails
const allowedEmails = ["shakesmofokeng88@gmail.com", "linvaroleather@gmail.com"];

// DOM elements
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const errorMsg = document.getElementById("errorMsg");

// Handle login
loginBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";
  loginBtn.disabled = true;

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!email || !password) {
    errorMsg.textContent = "Please enter both email and password.";
    loginBtn.disabled = false;
    return;
  }

  if (!allowedEmails.includes(email)) {
    errorMsg.textContent = "Access denied: Unauthorized email.";
    loginBtn.disabled = false;
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await sendEmailVerification(user);
      alert("Verification email sent! Please verify your email before logging in.");
      await signOut(auth);
      loginBtn.disabled = false;
      return;
    }

    // Store user info locally
    localStorage.setItem("loggedInUser", JSON.stringify({
      name: user.displayName || user.email,
      email: user.email
    }));

    // Redirect to dashboard
    window.location.href = "index.html";

  } catch (error) {
    const code = error.code;
    if (code === "auth/wrong-password") {
      errorMsg.textContent = "Incorrect password.";
    } else if (code === "auth/user-not-found") {
      errorMsg.textContent = "User not found.";
    } else {
      errorMsg.textContent = "Error: " + error.message;
    }
    loginBtn.disabled = false;
  }
});

// Auto-login if already signed in and verified
onAuthStateChanged(auth, user => {
  if (user && user.emailVerified && allowedEmails.includes(user.email.toLowerCase())) {
    localStorage.setItem("loggedInUser", JSON.stringify({
      name: user.displayName || user.email,
      email: user.email
    }));
    window.location.href = "index.html";
  }
});
