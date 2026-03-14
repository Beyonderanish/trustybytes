import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './People.css';
import backgroundVideo from '../assets/space-background.mp4'; 

export default function People() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [creators, setCreators] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const profileRef = useRef(null);
  const currentUser = localStorage.getItem("user") || "Admin";

  useEffect(() => {
    // We fetch from /articles because we know it contains the data
    fetch("http://localhost:8000/articles")
      .then(res => res.json())
      .then(allArticles => {
        if (Array.isArray(allArticles)) {
          // GROUPING LOGIC: Organize articles by their creator
          const userMap = {};

          allArticles.forEach(article => {
            const name = article.creator || "Unknown User";
            if (!userMap[name]) {
              userMap[name] = {
                name: name,
                articles: [],
                topic: article.topic || "General"
              };
            }
            userMap[name].articles.push(article.title);
          });

          // Convert the map back into an array for the table
          setCreators(Object.values(userMap));
        }
      })
      .catch(err => console.error("Error fetching data:", err));

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user"); 
      navigate('/'); 
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/home', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    { id: 'creator', label: 'Creator Studio', path: '/creator', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> },
    { id: 'review', label: 'Review', path: '/review', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> },
    { id: 'knowledge', label: 'Knowledge', path: '/knowledge-base', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> },
    { id: 'people', label: 'People', path: '/people', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
    { id: 'database', label: 'Database', path: '/database', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg> },
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
        <div className="nav-left"><div className="brand-logo">DELTA <span className="blue-text">BOX</span></div></div>
        <div className="nav-center">
          <div className="glass-capsule">
            {menuItems.map((item) => (
              <div key={item.id} className={`capsule-item ${location.pathname === item.path ? 'active' : ''}`} onClick={() => navigate(item.path)}>
                <span className="capsule-icon">{item.icon}</span>
                <span className="capsule-text">{item.label}</span>
                {location.pathname === item.path && <div className="active-dot" />}
              </div>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <div className="user-profile-circle" onClick={() => setShowDropdown(!showDropdown)} ref={profileRef}>
            <div className="avatar-img">{currentUser.charAt(0).toUpperCase()}</div>
            <div className="status-dot online" />
            {showDropdown && (
              <div className="profile-dropdown-float">
                <div className="dropdown-header"><strong>{currentUser}</strong><span>Admin Workspace</span></div>
                <button className="dropdown-item danger" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="people-main-content fade-in-up">
        <header className="page-hero-header">
          <h1 className="hero-title">System <span className="text-gradient">Intelligence</span></h1>
          <p className="hero-subtitle">Directory of active users and their contributions to the knowledge base.</p>
        </header>

        <div className="people-glass-container">
          <table className="people-table">
            <thead>
              <tr>
                <th>Member & Role</th>
                <th>Knowledge Contributions</th>
                <th>Primary Topic</th>
                <th style={{textAlign: 'right'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {creators.length > 0 ? (
                creators.map((person, index) => (
                  <tr key={index} className="table-row-hover">
                    <td>
                      <div className="member-info">
                        <div className={`member-avatar role-${(person.name || "").toLowerCase()}`}>
                          {(person.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="member-meta">
                          <span className="member-name">{person.name}</span>
                          <span className="member-role">
                            {person.name === 'Admin' ? 'System Administrator' : 
                             person.name === 'Lead' ? 'Quality Lead' : 'Content Editor'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="article-list-glass">
                        {person.articles.slice(0, 2).map((title, i) => (
                          <div key={i} className="article-entry">
                            <span className="entry-dot"></span> {title}
                          </div>
                        ))}
                        {person.articles.length > 2 && <span className="more-count">+{person.articles.length - 2} more</span>}
                      </div>
                    </td>
                    <td>
                      <span className="topic-tag">{person.topic}</span>
                    </td>
                    <td style={{textAlign: 'right'}}>
                      <span className="status-badge-glass">
                        <span className="status-dot"></span> Active
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center', padding: '50px', color: '#94a3b8'}}>
                    Gathering intelligence... No active contributors found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}