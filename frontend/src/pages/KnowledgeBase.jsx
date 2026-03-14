import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './KnowledgeBase.css';
import backgroundVideo from '../assets/space-background.mp4'; 

export default function KnowledgeBase() {
  const navigate = useNavigate();
  
  // --- NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState('knowledge');
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef(null);

  // --- DATA STATE ---
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
  }, []);

  const fetchData = () => {
    fetch('http://localhost:8000/articles')
      .then(res => res.json())
      .then(data => {
        // Only show published items in the Knowledge Base
        const publishedOnly = data.filter(item => item.status === 'published');
        setArticles(publishedOnly);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user"); 
      navigate('/'); 
    }
  };

  // --- POST ACTIONS ---
  const handleDelete = async (id) => {
    if (!window.confirm("WARNING: Delete this published intelligence?")) return;
    try {
      const res = await fetch(`http://localhost:8000/articles/${id}`, { method: 'DELETE' });
      if (res.ok) setArticles(articles.filter(a => a.id !== id));
    } catch (error) {
      alert("Error deleting document.");
    }
  };

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    article.content_body.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* --- FEED LAYOUT --- */}
      <div className="main-content-centered">
        <div className="feed-wrapper fade-in-up">
          <div className="feed-header-section">
            <h1 className="hero-title-small">Knowledge <span className="text-gradient">Base</span></h1>
            <p className="hero-subtitle-small">Explore all published enterprise intelligence.</p>
            <input 
              type="text" 
              className="kb-search-input"
              placeholder="Search intelligence..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <div className="feed-scroll-container">
            {loading ? (
              <div className="no-data-msg">Loading feed...</div>
            ) : filteredArticles.length === 0 ? (
              <div className="no-data-msg">No published posts found.</div>
            ) : (
              filteredArticles.map((post) => (
                <div key={post.id} className="feed-post-card">
                  
                  {/* POST HEADER */}
                  <div className="post-header">
                    <div className="post-creator-info">
                      <div className="post-avatar">{post.creator.charAt(0).toUpperCase()}</div>
                      <div className="post-meta-text">
                        <strong>{post.creator}</strong>
                        <span className="post-date">Published Intelligence</span>
                      </div>
                    </div>
                    <div className="post-badges">
                      <span className="post-category-pill">{post.content_type || 'Report'}</span>
                      <span className="post-status-pill published">LIVE</span>
                    </div>
                  </div>

                  {/* POST BODY */}
                  <div className="post-body">
                    <h3 className="post-title">{post.title}</h3>
                    <div 
                      className="post-desc-html" 
                      dangerouslySetInnerHTML={{ __html: post.content_body }} 
                    />
                    
                    {/* ATTACHMENT BOX */}
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

                  {/* POST FOOTER/ACTIONS */}
                  <div className="post-footer">
                    <div className="footer-left">
                      <button className="feed-btn read-btn" onClick={() => navigate(`/view/${post.id}`)}>
                        <span>📖</span> Read Full Doc
                      </button>
                      <button className="feed-btn summary-btn" onClick={() => navigate(`/summary/${post.id}`)}>
                        <span>✨</span> AI Summary
                      </button>
                    </div>
                    <div className="footer-right">
                      {/* ONLY DELETE REMAINS HERE */}
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