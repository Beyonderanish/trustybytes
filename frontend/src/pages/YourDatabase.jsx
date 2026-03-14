import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './YourDatabase.css';
import backgroundVideo from '../assets/space-background.mp4'; 

export default function YourDatabase() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('database');
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = localStorage.getItem("user") || "Guest";

  useEffect(() => {
    fetchData();
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentUser]);

  const fetchData = () => {
    fetch('http://localhost:8000/articles')
      .then(res => res.json())
      .then(result => {
        const myData = result.filter(item => item.creator === currentUser);
        setData(myData);
        setLoading(false);
      })
      .catch(err => console.error("Database Error:", err));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("WARNING: Confirm deletion from database?")) return;
    try {
      await fetch(`http://localhost:8000/articles/${id}`, { method: 'DELETE' });
      setData(data.filter(item => item.id !== id));
    } catch (error) {
      alert("Database Error: Could not delete.");
    }
  };

  const handleSendToReview = async (id) => {
    if(!window.confirm("Send this draft to the Review Team?")) return;
    try {
        const response = await fetch(`http://localhost:8000/articles/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'pending_review' })
        });
        if (response.ok) {
            alert("Success: Document sent to Review Panel.");
            fetchData(); 
        }
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user"); 
      navigate('/'); 
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/home', icon: '⊞' },
    { id: 'creator', label: 'Creator Studio', path: '/creator', icon: '✨' },
    { id: 'review', label: 'Review', path: '/review', icon: '✓' },
    { id: 'knowledge', label: 'Knowledge', path: '/knowledge-base', icon: '📚' },
    { id: 'people', label: 'People', path: '/people', icon: '👥' },
    { id: 'database', label: 'Database', path: '/database', icon: '🗄️' },
  ];

  return (
    <div className="dashboard-container">
      <div className="background-video-wrapper">
        <video autoPlay loop muted playsInline className="background-video">
          <source src={backgroundVideo} type="video/mp4" />
        </video>
        <div className="video-overlay"></div>
      </div>

      <nav className={`top-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-left">
          <div className="brand-logo">DELTA <span className="blue-text">BOX</span></div>
        </div>
        <div className="nav-center">
          <div className="glass-capsule">
            {menuItems.map((item) => (
              <div 
                key={item.id}
                className={`capsule-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if(item.path !== '/home') navigate(item.path);
                }}
              >
                <span className="capsule-icon">{item.icon}</span>
                <span className="capsule-text">{item.label}</span>
                {activeTab === item.id && <div className="active-dot" />}
              </div>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <div className="user-profile-circle" onClick={() => setShowDropdown(!showDropdown)} ref={profileRef}>
            <div className="avatar-img">{currentUser.charAt(0).toUpperCase()}</div>
            <div className={`status-dot online`} />
            {showDropdown && (
              <div className="profile-dropdown-float">
                <div className="dropdown-header">
                  <strong>{currentUser}</strong>
                  <span>Admin Workspace</span>
                </div>
                <button className="dropdown-item danger" onClick={(e) => { e.stopPropagation(); handleLogout(); }}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="main-content-centered">
        <div className="feed-wrapper fade-in-up">
          <div className="feed-header-section">
            <h1 className="hero-title-small">Your <span className="text-gradient">Database</span></h1>
            <p className="hero-subtitle-small">Your published posts, drafts, and submissions.</p>
            <span className="record-count-badge">{data.length} Posts</span>
          </div>

          <div className="feed-scroll-container">
            {loading ? (
              <div className="no-data-msg">Loading feed...</div>
            ) : data.length === 0 ? (
              <div className="no-data-msg">No posts found in your database.</div>
            ) : (
              data.map((post) => (
                <div key={post.id} className="feed-post-card">
                  <div className="post-header">
                    <div className="post-creator-info">
                      <div className="post-avatar">{post.creator.charAt(0).toUpperCase()}</div>
                      <div className="post-meta-text">
                        <strong>{post.creator}</strong>
                        <span className="post-date">Just now</span>
                      </div>
                    </div>
                    <div className="post-badges">
                      <span className="post-category-pill">{post.content_type}</span>
                      <span className={`post-status-pill ${!post.status || post.status === 'draft' ? 'draft' : 'pending'}`}>
                        {post.status ? post.status.replace('_', ' ').toUpperCase() : 'DRAFT'}
                      </span>
                    </div>
                  </div>

                  <div className="post-body">
                    <h3 className="post-title">{post.title}</h3>
                    <div className="post-desc-html" dangerouslySetInnerHTML={{ __html: post.content_body }} />
                    
                    {post.media_url && (
                      <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="post-attachment-box">
                        <div className="attachment-icon">📎</div>
                        <div className="attachment-details">
                          <span className="attachment-name">Attached File</span>
                          <span className="attachment-type">Click to view/download media</span>
                        </div>
                      </a>
                    )}
                  </div>

                  <div className="post-footer">
                    <div className="footer-left">
                      {(post.status === 'draft' || !post.status) && (
                        <button className="feed-btn review-btn" onClick={() => handleSendToReview(post.id)}>
                          <span>🚀</span> Send to Review
                        </button>
                      )}
                    </div>
                    <div className="footer-right">
                      {/* THIS BUTTON NOW NAVIGATES TO THE EDIT PAGE */}
                      <button className="feed-btn edit-btn" onClick={() => navigate('/edit-post', { state: { post } })}>
                        <span>✏️</span> Edit Full Page
                      </button>
                      <button className="feed-btn delete-btn" onClick={() => handleDelete(post.id)}>
                        <span>🗑️</span> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}