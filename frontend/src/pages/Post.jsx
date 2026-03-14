import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './Post.css';

export default function Post() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Reports");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const categories = [
    "Code", "SOP", "Instruction", "Guidelines", "Design files", 
    "Code files", "Images", "Videos", "Reports", "Project requirements", 
    "System architecture", "API documentation", "User guides"
  ];

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAction = async (actionStatus) => {
    if (!title.trim()) return alert("Please enter a title.");
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content_body", description); 
    formData.append("content_type", category);
    formData.append("creator", localStorage.getItem("user") || "Admin");
    formData.append("status", actionStatus); // Sends 'draft' or 'published' dynamically
    
    if (selectedFile) formData.append("file", selectedFile);

    try {
      const response = await fetch("http://localhost:8000/articles/post", {
        method: "POST",
        body: formData, 
      });
      if (response.ok) {
        if (actionStatus === 'draft') {
            navigate('/database'); 
        } else {
            navigate('/knowledge-base');
        }
      } else {
        alert("Server error while saving.");
      }
    } catch (error) {
      alert("Network error. Action failed.");
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
          <h2>Create <span className="text-gradient">New Post</span></h2>
          <button className="close-btn" onClick={() => navigate('/home')}>×</button>
        </header>

        <div className="post-form-group">
          <label>Title</label>
          <input 
            type="text" 
            className="post-input"
            placeholder="Enter post title..." 
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
              placeholder="Write your abstract or embed files directly here..."
            />
          </div>
        </div>

        <div className="post-form-group">
          <label>Main Attachment</label>
          <div className="file-upload-zone" onClick={() => fileInputRef.current.click()}>
            {selectedFile ? (
              <span className="file-name">📎 {selectedFile.name}</span>
            ) : (
              <span className="upload-placeholder">📥 Click to upload PDF, DOCX, ZIP, MP4, etc.</span>
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

        <div className="post-actions">
          <button 
            className="save-btn" 
            onClick={() => handleAction('draft')} 
            disabled={isUploading}
          >
            {isUploading ? "Processing..." : "Save to Database"}
          </button>
          
          <button 
            className="publish-btn" 
            onClick={() => handleAction('published')} 
            disabled={isUploading}
          >
            {isUploading ? "Publishing..." : "Publish Post"}
          </button>
        </div>
      </div>
    </div>
  );
}