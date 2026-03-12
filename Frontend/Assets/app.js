/**
<<<<<<< HEAD
 Shared frontend utilities for all pages.
 * This file handles:
 * - API base URL
 * - JWT token storage
 * - helper functions for DOM and formatting
 */

const API_BASE = "http://localhost:4000";

=======
 * app.js
 * Shared frontend utilities for all pages.
 *
 * This file handles:
 * - API base URL
 * - JWT token storage
 * - role-based page protection
 * - helper functions for DOM and formatting
 */

// Backend API base (edit if your backend runs elsewhere)
const API_BASE = "http://localhost:4000";

// ---------------------------
// Local storage helpers
// ---------------------------
>>>>>>> ce371b3 (frontendcomplete)
function getToken(){ return localStorage.getItem("token"); }
function getUser(){
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
function setAuth(token, user){
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
function clearAuth(){
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

<<<<<<< HEAD
/*
=======
// ---------------------------
// Route protection
// ---------------------------
/**
>>>>>>> ce371b3 (frontendcomplete)
 * Require the user to be logged in.
 * If a role is provided, also enforce role-based access control (RBAC).
 */
function requireAuth(role){
  const user = getUser();
  const token = getToken();

  // If not logged in, redirect to login page
  if(!user || !token){
    window.location.href = "login.html";
    return;
  }

  // If role mismatch, redirect to correct dashboard
  if(role && user.role !== role){
    window.location.href = (user.role === "ADMIN")
      ? "admin-dashboard.html"
      : "operator-dashboard.html";
    return;
  }
}

<<<<<<< HEAD
/*
=======
/**
>>>>>>> ce371b3 (frontendcomplete)
 * Update the header title and display user info on protected pages.
 */
function setHeader(title){
  const user = getUser();
  const pageTitle = document.querySelector("#pageTitle");
  if(pageTitle) pageTitle.textContent = title;

  const meta = document.querySelector("#userMeta");
  if(meta) meta.textContent = user ? `${user.email} (${user.role})` : "";
}

<<<<<<< HEAD
/*
=======
/**
>>>>>>> ce371b3 (frontendcomplete)
 * Highlight active nav link based on current file name.
 */
function setNavActive(){
  const path = window.location.pathname.split("/").pop();
  document.querySelectorAll("nav a").forEach(a => {
    if(a.getAttribute("href") === path) a.classList.add("active");
  });
}

// ---------------------------
// API helper
// ---------------------------
/**
 * Wrapper around fetch() that:
 * - adds JSON headers
<<<<<<< HEAD
=======
 * - attaches JWT token automatically
>>>>>>> ce371b3 (frontendcomplete)
 * - parses JSON responses
 * - throws a readable error message for UI
 */
async function apiFetch(path, options = {}){
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";

  const token = getToken();
  if(token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(API_BASE + path, { ...options, headers });

<<<<<<< HEAD
  // Some endpoints return text, most return JSON
=======
  // Some endpoints return text; most return JSON
>>>>>>> ce371b3 (frontendcomplete)
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if(!res.ok){
    const msg = (data && data.error)
      ? data.error
      : (typeof data === "string" ? data : "Request failed");
    throw new Error(msg);
  }
  return data;
}

<<<<<<< HEAD
// UI helpers
=======
// ---------------------------
// UI helpers
// ---------------------------
>>>>>>> ce371b3 (frontendcomplete)
function logout(){
  clearAuth();
  window.location.href = "login.html";
}
function q(id){ return document.getElementById(id); }

/** Format a record status as a pill badge */
function fmtStatus(status){
  return `<span class="badge">${status}</span>`;
<<<<<<< HEAD
}
=======
}
>>>>>>> ce371b3 (frontendcomplete)
