import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

// Ensure this path matches your folder structure
import backgroundVideo from '../assets/space-background.mp4'; 

export default function Home() {
  const navigate = useNavigate();
  
  // --- NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState("Admin");
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef(null);

  // --- SEARCH FUNCTIONALITY STATE ---
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [articles, setArticles] = useState([]); 
  const [results, setResults] = useState([]);   
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Fetch Articles
  useEffect(() => {
    fetch("http://localhost:8000/articles")
      .then(res => res.json())
      .then(data => setArticles(data))
      .catch(err => console.error("Search fetch error:", err));
      
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Filter
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    const lowerQuery = debouncedQuery.toLowerCase();
    const filtered = articles.map(doc => {
      const rawText = (doc.content_body || "").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const inTitle = doc.title?.toLowerCase().includes(lowerQuery);
      const inBody = rawText.toLowerCase().includes(lowerQuery);

      if (inTitle || inBody) {
        return { ...doc, matchSnippet: inBody ? getSnippet(rawText, lowerQuery) : rawText.substring(0, 80) + "..." };
      }
      return null;
    }).filter(item => item !== null);

    setResults(filtered.slice(0, 5)); 
  }, [debouncedQuery, articles]);

  // Search Helpers
  const getSnippet = (text, keyword) => {
    const index = text.toLowerCase().indexOf(keyword);
    if (index === -1) return text.substring(0, 80) + "...";
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + keyword.length + 50);
    return "..." + text.substring(start, end) + "...";
  };

  const highlightMatch = (text, keyword) => {
    if (!keyword || !text) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === keyword.toLowerCase() ? 
            <span key={i} className="match-highlight">{part}</span> : part
        )}
      </span>
    );
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user"); 
      navigate('/'); 
    }
  };

  // --- UPDATED MENU ITEMS WITH SVG ICONS ---
  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      path: '/home',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
    },
    { 
      id: 'creator', 
      label: 'Creator Studio', 
      path: '/creator',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
    },
    { 
      id: 'review', 
      label: 'Review', 
      path: '/review',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
    },
    { 
      id: 'knowledge', 
      label: 'Knowledge', 
      path: '/knowledge-base',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
    },
    { 
      id: 'post', 
      label: 'Post', 
      path: '/post',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
    },
    { 
      id: 'people', 
      label: 'People', 
      path: '/people',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    },
    { 
      id: 'database', 
      label: 'Database', 
      path: '/database',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
    },
  ];

  return (
    <div className="dashboard-container">
      
      {/* --- VIDEO BACKGROUND --- */}
      <div className="background-video-wrapper">
        <video autoPlay loop muted playsInline className="background-video">
          <source src={backgroundVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="video-overlay"></div>
      </div>

      {/* --- TOP NAVBAR --- */}
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
          <div 
            className="user-profile-circle" 
            onClick={() => setShowDropdown(!showDropdown)}
            ref={profileRef}
          >
            <div className="avatar-img">{currentUser.charAt(0).toUpperCase()}</div>
            <div className={`status-dot online`} />
            
            {showDropdown && (
              <div className="profile-dropdown-float">
                <div className="dropdown-header">
                  <strong>{currentUser}</strong>
                  <span>Admin Workspace</span>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={(e) => { e.stopPropagation(); handleLogout(); }}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT HERO --- */}
      <div className="main-content-centered">
        <div className="hero-section fade-in-up">
          <h1 className="hero-title">
            Build your <span className="text-gradient">digital empire</span>
          </h1>
          <p className="hero-subtitle">
            Centralized control for analytics, content creation, and team management.
          </p>
          
          {/* --- SEARCH BAR --- */}
          <div className="hero-search-wrapper" ref={searchRef}>
             <div className={`custom-glass-search ${isSearchOpen ? 'active' : ''}`}>
               <svg className="search-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="url(#paint0_linear)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                 <path d="M21 21L16.65 16.65" stroke="url(#paint0_linear)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                 <defs>
                   <linearGradient id="paint0_linear" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                     <stop stopColor="#60a5fa"/>
                     <stop offset="1" stopColor="#a78bfa"/>
                   </linearGradient>
                 </defs>
               </svg>
               <input 
                 type="text" 
                 placeholder="Search phrase or sentence..." 
                 value={query}
                 onChange={(e) => { setQuery(e.target.value); setIsSearchOpen(true); }}
                 onFocus={() => setIsSearchOpen(true)}
               />
               {query && <button className="search-clear-btn" onClick={() => setQuery("")}>×</button>}
             </div>

             {isSearchOpen && debouncedQuery && (
               <div className="hero-results-dropdown">
                 <div className="results-header">
                   <span>Results</span>
                   <span className="results-badge">{results.length} found</span>
                 </div>
                 <div className="results-list">
                   {results.length > 0 ? (
                     results.map(doc => (
                       <div key={doc.id} className="hero-result-item" onClick={() => navigate(`/view/${doc.id}`)}>
                         <div className="result-icon">📄</div>
                         <div className="result-meta">
                           <h4>{highlightMatch(doc.title, debouncedQuery)}</h4>
                           <p>{highlightMatch(doc.matchSnippet, debouncedQuery)}</p>
                         </div>
                         <span className="result-arrow">→</span>
                       </div>
                     ))
                   ) : (
                     <div className="no-results">No matches for "{debouncedQuery}"</div>
                   )}
                 </div>
               </div>
             )}
          </div>

          <div className="hero-actions">
            <button className="hero-btn primary glow-effect" onClick={() => navigate('/creator')}>Launch Studio</button>
            <button className="hero-btn secondary" onClick={() => navigate('/review')}>View Drafts</button>
          </div>
        </div>
      </div>
    </div>
  );
}