import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';

// --- IMPORT ALL PAGES ---
import Home from './pages/Home';
import Creator from './pages/Creator';
import KnowledgeBase from './pages/KnowledgeBase';
import YourDatabase from './pages/YourDatabase';
import ViewDocument from './pages/ViewDocument';
import People from './pages/People'; 
import Review from './pages/Review';
import Summary from './pages/Summary';
import Post from './pages/Post';
import EditPost from './pages/EditPost'; 
import DocumentEditor from './pages/DocumentEditor';// Adjust path if needed

// --- IMPORT ASSETS & CSS ---
import './App.css';
import bgLoginVideo from './assets/bglogin.mp4'; 

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const users = [
    { id: "Admin",  username: "admin", password: "deltabox123" },
    { id: "User1",  username: "user",  password: "user123" },
    { id: "User2",  username: "user",  password: "user213" },
    { id: "approver",  username: "lead",  password: "lead123" }
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    const validUser = users.find(
      (u) => u.username === username && u.password === password
    );

    if (validUser) {
        localStorage.setItem("user", validUser.id);
        navigate('/home'); 
    } else {
        alert("Invalid credentials.");
    }
  };

  return (
    <div className="login-page-container">
      
      {/* --- VIDEO BACKGROUND --- */}
      <div className="video-background-wrapper">
        <video autoPlay loop muted playsInline className="background-video">
          <source src={bgLoginVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="video-overlay"></div>
      </div>

      <main className="login-content">
        <div className="glass-card">
          <div className="card-logo">
            DELTA<span className="blue-text-logo">BOX</span>
          </div>

          <h2>Welcome Back</h2>
          <p className="subtitle">Collaborate, edit, and publish work with your team in one unified platform.</p>
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                placeholder="Enter your username" 
                className="modern-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="modern-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" /> Remember me
              </label>
              <span className="forgot-pass">Forgot password?</span>
            </div>

            <button type="submit" className="primary-login-btn">Log in to DeltaBox</button>
          </form>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/creator" element={<Creator />} />
        <Route path="/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/database" element={<YourDatabase />} />
        <Route path="/view/:id" element={<ViewDocument />} />        
        <Route path="/people" element={<People />} />
        <Route path="/post" element={<Post />} />
        <Route path="/review" element={<Review />} />
        <Route path="/summary/:id" element={<Summary />} />
        <Route path="/edit-post" element={<EditPost />} />
        <Route path="/edit-document/:id" element={<DocumentEditor />} />
      </Routes>
    </Router>
  );
}

export default App;