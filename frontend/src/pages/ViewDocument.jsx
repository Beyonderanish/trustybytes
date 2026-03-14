import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './ViewDocument.css';
import backgroundVideo from '../assets/space-background.mp4';
import Comment from './Comment';

export default function ViewDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);

  const [article, setArticle] = useState(null);
  const [contextComments, setContextComments] = useState([]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Highlighting state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, range: null });
  const [inputBox, setInputBox] = useState({ visible: false, text: '', range: null });

  // Robustly detect the lead/approver user regardless of how login stores the value.
  // Handles: stored as plain string "lead", stored as JSON, or stored by id "approver"
  const _rawUser = localStorage.getItem('user') || '';
  const currentUser = (() => {
    try {
      const parsed = JSON.parse(_rawUser);
      return parsed.username || parsed.id || _rawUser;
    } catch {
      return _rawUser || 'Guest';
    }
  })();
  const _userId = (() => {
    try { return JSON.parse(_rawUser).id || ''; } catch { return ''; }
  })();
  const isApprover =
    currentUser === 'lead' ||
    currentUser === 'approver' ||
    _userId === 'approver' ||
    _rawUser === 'lead';

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = () => {
    fetch(`http://localhost:8000/articles/${id}`)
      .then(res => res.json())
      .then(data => {
        setArticle(data);
        setEditContent(data.content_body || '');
      });
    fetch(`http://localhost:8000/context-comments/${id}`)
      .then(res => res.json())
      .then(data => setContextComments(Array.isArray(data) ? data : []));
  };

  /* ── EDIT MODE ──────────────────────────────────────── */

  const handleStartEdit = () => {
    setEditContent(article.content_body || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(article.content_body || '');
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const res = await fetch(`http://localhost:8000/articles/${id}/content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_body: editContent }),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchData();
      } else {
        alert('Save failed. Please try again.');
      }
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  /* ── APPROVE / REJECT ───────────────────────────────── */

  const handleApprove = async () => {
    if (isEditing) {
      alert('Please save or cancel your edits before approving.');
      return;
    }
    if (!window.confirm('Approve and publish to Knowledge Base?')) return;
    await fetch(`http://localhost:8000/articles/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    });
    navigate('/review');
  };

  const handleReject = async () => {
    if (isEditing) {
      alert('Please save or cancel your edits before rejecting.');
      return;
    }
    const reason = prompt('Rejection Reason:');
    if (!reason) return;
    await fetch(`http://localhost:8000/articles/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    });
    navigate('/review');
  };

  /* ── HIGHLIGHT / COMMENTS ───────────────────────────── */

  const onRightClick = (e) => {
    if (isEditing) return;
    const selection = window.getSelection();
    if (
      selection.toString().trim().length > 0 &&
      contentRef.current.contains(selection.anchorNode)
    ) {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        range: selection.getRangeAt(0).cloneRange(),
      });
    } else {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const saveContextComment = async () => {
    if (!inputBox.text.trim() || !inputBox.range) return;

    const highlightId = `hl-${Date.now()}`;
    const span = document.createElement('span');
    span.id = highlightId;
    span.className = 'context-highlight';

    try {
      const range = inputBox.range;
      span.appendChild(range.extractContents());
      range.insertNode(span);
      window.getSelection().removeAllRanges();
    } catch (e) {
      alert('Selection error. Try selecting plain text.');
      return;
    }

    const updatedHtml = contentRef.current.innerHTML;
    const payload = {
      article_id: id,
      highlight_id: highlightId,
      text: inputBox.text,
      author: currentUser,
    };

    const res = await fetch('http://localhost:8000/context-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await fetch(`http://localhost:8000/articles/${id}/content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_body: updatedHtml }),
      });
      setInputBox({ visible: false, text: '', range: null });
      fetchData();
    }
  };

  const deleteContext = async (cid, hid) => {
    if (!window.confirm('Delete this note?')) return;
    await fetch(`http://localhost:8000/context-comments/${cid}`, { method: 'DELETE' });

    const el = document.getElementById(hid);
    if (el) {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }

    await fetch(`http://localhost:8000/articles/${id}/content`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_body: contentRef.current.innerHTML }),
    });
    fetchData();
  };

  const updateContext = async (cid, newText) => {
    await fetch(`http://localhost:8000/context-comments/${cid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText }),
    });
    fetchData();
  };

  const locateHighlight = (hid) => {
    const el = document.getElementById(hid);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('active-flash');
      setTimeout(() => el.classList.remove('active-flash'), 2500);
    }
  };

  /* ── QUILL MODULES ──────────────────────────────────── */

  const editModules = React.useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean'],
    ],
  }), []);

  /* ── RENDER ─────────────────────────────────────────── */

  if (!article) return <div className="loading-screen">INITIALIZING...</div>;

  return (
    <div
      className="view-page-wrapper"
      onClick={() => setContextMenu({ ...contextMenu, visible: false })}
    >
      {/* BACKGROUND */}
      <div className="background-video-wrapper">
        <video autoPlay loop muted playsInline className="background-video">
          <source src={backgroundVideo} type="video/mp4" />
        </video>
        <div className="video-overlay"></div>
      </div>

      {/* ── ACTION BAR: approver + pending_review only ── */}
      {isApprover && article.status === 'pending_review' && (
        <div className={`review-action-header fade-in-up${isEditing ? ' editing-mode' : ''}`}>
          {isEditing ? (
            <>
              <div className="review-status-info editing-indicator">
                <span className="edit-pulse" />
                <strong>EDITING DOCUMENT</strong>
                <span className="edit-hint">Unsaved changes</span>
              </div>
              <div className="review-btn-group">
                <button className="review-btn cancel-edit" onClick={handleCancelEdit}>
                  ✕ Cancel
                </button>
                <button
                  className="review-btn save-edit"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="review-status-info">
                <strong>AWAITING APPROVAL</strong>
              </div>
              <div className="review-btn-group">
                <button className="review-btn edit-doc" onClick={handleStartEdit}>
                  ✏️ Edit
                </button>
                <button className="review-btn reject" onClick={handleReject}>
                  Reject ✕
                </button>
                <button className="review-btn approve" onClick={handleApprove}>
                  Approve ✓
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="view-main-layout">
        <div className="document-scroll-area">
          <header className="document-header-meta fade-in-up">
            <h1 className="text-gradient">{article.title}</h1>
            <div className="meta-badges">
              <span className="meta-badge">AUTH: {article.creator}</span>
              {isEditing && (
                <span className="meta-badge editing-badge">✏️ EDIT MODE</span>
              )}
            </div>
          </header>

          <div className="paper-container fade-in-up">
            {isEditing ? (
              <div className="document-paper edit-mode-paper">
                <ReactQuill
                  theme="snow"
                  value={editContent}
                  onChange={setEditContent}
                  modules={editModules}
                  className="doc-editor-quill"
                />
              </div>
            ) : (
              <div
                ref={contentRef}
                onContextMenu={onRightClick}
                className="document-paper"
                dangerouslySetInnerHTML={{ __html: article.content_body }}
              />
            )}
          </div>
        </div>

        {/* Comments sidebar — hidden while editing */}
        {!isEditing && (
          <Comment
            comments={contextComments}
            onSave={saveContextComment}
            onUpdate={updateContext}
            onDelete={deleteContext}
            onLocate={locateHighlight}
            inputBox={inputBox}
            setInputBox={setInputBox}
          />
        )}

        {contextMenu.visible && (
          <div
            className="custom-ctx-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => {
              e.stopPropagation();
              setInputBox({ visible: true, text: '', range: contextMenu.range });
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            📝 Add Comment
          </div>
        )}
      </div>
    </div>
  );
}