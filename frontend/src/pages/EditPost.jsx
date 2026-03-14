import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './Post.css'; // Reusing your existing beautiful Post styling

export default function EditPost() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  
  const [postId, setPostId] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Reports");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const categories = [
    "Code", "SOP", "Instruction", "Guidelines", "Design files", 
    "Code files", "Images", "Videos", "Reports", "Project requirements", 
    "System architecture", "API documentation", "User guides"
  ];

  // Always fetch fresh data from the API so we get the latest
  // content_body (e.g. content saved via DocumentEditor)
  useEffect(() => {
    const postFromState = location.state?.post;

    if (!postFromState?.id) {
      navigate('/database');
      return;
    }

    const fetchLatest = async () => {
      try {
        const res = await fetch(`http://localhost:8000/articles/${postFromState.id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const post = await res.json();
        setPostId(post.id);
        setTitle(post.title || "");
        setCategory(post.content_type || "Reports");
        setDescription(post.content_body || "");
        setStatus(post.status || "draft");
        setExistingMediaUrl(post.media_url);
      } catch {
        // Fallback to navigation state if API is unreachable
        setPostId(postFromState.id);
        setTitle(postFromState.title || "");
        setCategory(postFromState.content_type || "Reports");
        setDescription(postFromState.content_body || "");
        setStatus(postFromState.status || "draft");
        setExistingMediaUrl(postFromState.media_url);
      }
    };

    fetchLatest();
  }, [location, navigate]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) return alert("Please enter a title.");
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content_body", description); 
    formData.append("content_type", category);
    formData.append("status", status); // Keeps it as a draft or published depending on what it was
    
    // If they selected a new file, attach it to replace the old one
    if (selectedFile) {
        formData.append("file", selectedFile);
    }

    try {
      const response = await fetch(`http://localhost:8000/articles/post/${postId}`, {
        method: "PUT",
        body: formData, 
      });
      if (response.ok) {
        navigate('/database'); 
      } else {
        alert("Server error while updating.");
      }
    } catch (error) {
      alert("Network error. Update failed.");
    } finally { 
      setIsUploading(false); 
    }
  };

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  }), []);

  return (
    <div className="post-container">
      <div className="post-card fade-in-up">
        <header className="post-header">
          <h2>Edit <span className="text-gradient">Post</span></h2>
          <button className="close-btn" onClick={() => navigate('/database')}>×</button>
        </header>

        <div className="post-form-group">
          <label>Title</label>
          <input 
            type="text" 
            className="post-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="post-form-group">
          <label>Category</label>
          <select 
            className="post-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="post-form-group">
          <label>Description & Abstract</label>
          <div className="quill-wrapper">
            <ReactQuill 
              theme="snow" 
              value={description} 
              onChange={setDescription} 
              modules={modules}
            />
          </div>
        </div>

        <div className="post-form-group">
          <label>Attachment Configuration</label>
          
          {/* Shows the existing file if they haven't uploaded a new one yet */}
          {existingMediaUrl && !selectedFile && (
             <div style={{ marginBottom: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>CURRENT ATTACHMENT</div>
                  <a href={existingMediaUrl} target="_blank" rel="noreferrer" style={{color: '#60a5fa', fontWeight: 'bold', textDecoration: 'none'}}>📄 View Original File</a>
                </div>
                <button 
                  onClick={(e) => { e.preventDefault(); navigate(`/edit-document/${postId}`); }}
                  style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  ✏️ Extract & Edit File
                </button>
             </div>
          )}

          <div className="file-upload-zone" onClick={() => fileInputRef.current.click()}>
            {selectedFile ? (
              <span className="file-name">📎 NEW FILE: {selectedFile.name} (Will replace old file)</span>
            ) : (
              <span className="upload-placeholder">📥 Click to upload a new file to replace the existing one</span>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{display:'none'}} 
            onChange={handleFileChange} 
            accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.svg,.mp3,.wav,.mp4,.avi,.zip,.rar" 
          />
        </div>

        <div className="post-actions" style={{ justifyContent: 'flex-end' }}>
          <button 
            className="publish-btn" 
            onClick={handleUpdate} 
            disabled={isUploading}
          >
            {isUploading ? "Saving Changes..." : "Update Post"}
          </button>
        </div>
      </div>
    </div>
  );
}