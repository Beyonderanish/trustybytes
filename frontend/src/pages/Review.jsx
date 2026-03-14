import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Review.css';
import backgroundVideo from '../assets/space-background.mp4'; 

export default function Review() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reviews, setReviews] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const currentUser = localStorage.getItem("user") || "Admin";

  // Robust approver check — handles JSON object, plain string, or id field
  const _rawUser = localStorage.getItem("user") || "";
  const _parsedUser = (() => { try { return JSON.parse(_rawUser); } catch { return null; } })();
  const _username = _parsedUser ? (_parsedUser.username || _parsedUser.id || _rawUser) : _rawUser;
  const _userId   = _parsedUser ? (_parsedUser.id || '') : '';
  const isLeadUser =
    _username === 'lead' ||
    _username === 'approver' ||
    _userId   === 'approver' ||
    _rawUser  === 'lead';

  useEffect(() => {
    fetch('http://localhost:8000/articles')
      .then(res => res.json())
      .then(data => {
        const pending = data.filter(a => a.status === 'pending_review');
        setReviews(pending);
      })
      .catch(err => console.error(err));

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleApprove = async (e, id) => {
    e.stopPropagation();
    if(!window.confirm("Approve and Publish to Knowledge Base?")) return;
    
    await fetch(`http://localhost:8000/articles/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
    });
    setReviews(reviews.filter(r => r.id !== id));
  };

  // Reuse the exact menu structure from Home.jsx
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/home', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    { id: 'creator', label: 'Creator Studio', path: '/creator', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> },
    { id: 'review', label: 'Review', path: '/review', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> },
    { id: 'knowledge', label: 'Knowledge', path: '/knowledge-base', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> },
  ];

  return (
    <div className="dashboard-container">
      {/* --- SHARED BACKGROUND --- */}
      <div className="background-video-wrapper">
        <video autoPlay loop muted playsInline className="background-video">
          <source src={backgroundVideo} type="video/mp4" />
        </video>
        <div className="video-overlay"></div>
      </div>

      {/* --- SHARED NAVBAR --- */}
      <nav className={`top-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-left">
          <div className="brand-logo">DELTA <span className="blue-text">BOX</span></div>
        </div>
        <div className="nav-center">
          <div className="glass-capsule">
            {menuItems.map((item) => (
              <div 
                key={item.id}
                className={`capsule-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="capsule-icon">{item.icon}</span>
                <span className="capsule-text">{item.label}</span>
                {location.pathname === item.path && <div className="active-dot" />}
              </div>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <div className="user-profile-circle">
            <div className="avatar-img">{currentUser.charAt(0).toUpperCase()}</div>
            <div className="status-dot online" />
          </div>
        </div>
      </nav>

      {/* --- REVIEW SPECIFIC CONTENT --- */}
      <main className="review-main-content fade-in-up">
        <header className="page-hero-header">
          <h1 className="hero-title" style={{ fontSize: '3rem' }}>
            Pending <span className="text-gradient">Approvals</span>
          </h1>
          <p className="hero-subtitle">Review and publish documents to the digital empire.</p>
        </header>

        <div className="review-grid">
           {reviews.length === 0 ? (
             <div className="empty-state-glass">
               <div className="empty-icon">✨</div>
               <h3>All caught up!</h3>
               <p>No documents are currently waiting for review.</p>
             </div>
           ) : (
             reviews.map(item => (
               <div
                 key={item.id}
                 className={`glass-card review-card${isLeadUser ? ' lead-card' : ''}`}
                 onClick={() => navigate(`/view/${item.id}`)}
               >
                 <div className="card-content">
                    <h3>{item.title}</h3>
                    <p>{item.description || "No description provided."}</p>
                    <div className="card-footer">
                        <span className="author-tag">By {item.creator}</span>
                        {isLeadUser ? (
                          /* Lead user must open the doc to edit + approve */
                          <button
                            className="review-action-btn lead-review-btn"
                            onClick={(e) => { e.stopPropagation(); navigate(`/view/${item.id}`); }}
                          >
                            ✏️ Review &amp; Edit
                          </button>
                        ) : (
                          <button className="approve-action-btn" onClick={(e) => handleApprove(e, item.id)}>
                            Approve
                          </button>
                        )}
                    </div>
                 </div>
               </div>
             ))
           )}
        </div>
      </main>
    </div>
  );
}