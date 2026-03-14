import React, { useState } from 'react';
import './Comment.css';

export default function Comment({ 
  comments, 
  onSave, 
  onUpdate, 
  onDelete, 
  onLocate, 
  inputBox, 
  setInputBox 
}) {
  const [editText, setEditText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const currentUser = localStorage.getItem("user") || "Guest";

  return (
    <aside className="comments-sidebar">
      {/* HEADER */}
      <div className="sidebar-header">
        <h3>Context <span className="text-gradient">Notes</span> <span className="comment-count-badge">{comments.length}</span></h3>
      </div>

      <div className="comments-content">
        
        {/* INPUT BOX (FLOATING AT TOP WHEN ACTIVE) */}
        {inputBox.visible && (
          <div className="context-input-card">
            <span className="input-header">New Note</span>
            <textarea 
              autoFocus 
              placeholder="Type your observation here..." 
              value={inputBox.text} 
              onChange={e => setInputBox({ ...inputBox, text: e.target.value })} 
            />
            <div className="card-actions">
              <button className="btn-cancel" onClick={() => setInputBox({ visible: false, text: "", range: null })}>Cancel</button>
              <button className="btn-save" onClick={onSave}>Save Note</button>
            </div>
          </div>
        )}

        {/* SCROLLABLE LIST */}
        <div className="comments-scroll">
          {comments.length === 0 && !inputBox.visible ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>Highlight text in the document<br/>and right-click to add a note.</p>
            </div>
          ) : (
            comments.map((c) => (
              <div 
                key={c.id} 
                className="glass-comment-card" 
                onClick={() => onLocate(c.highlight_id)}
              >
                {/* HEADER: Author & Actions */}
                <div className="comment-header">
                  <div className="author-Badge">
                    <span className="author">{c.author}</span>
                    <span className="timestamp">Context Note</span>
                  </div>
                  
                  {currentUser === c.author && (
                    <div className="action-btns">
                      <button 
                        title="Edit Note"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingId(c.id); 
                          setEditText(c.text); 
                        }}
                      >
                        ✎
                      </button>
                      <button 
                        className="delete-btn"
                        title="Delete Note"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onDelete(c.id, c.highlight_id); 
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>

                {/* CONTENT: Edit Mode vs View Mode */}
                {editingId === c.id ? (
                  <div className="edit-box" onClick={e => e.stopPropagation()}>
                    <textarea 
                      value={editText} 
                      onClick={e => e.stopPropagation()} // Prevent click-through to locate
                      onChange={e => setEditText(e.target.value)} 
                    />
                    <button className="btn-update" onClick={() => { onUpdate(c.id, editText); setEditingId(null); }}>
                      Confirm Update
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="comment-text">"{c.text}"</p>
                    <small className="trace-hint">Click card to trace source →</small>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}