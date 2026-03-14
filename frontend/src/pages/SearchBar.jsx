import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Summary.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stripHtml = (html) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.innerText || tmp.textContent || '').replace(/\s+/g, ' ').trim();
};

const toBase64 = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = () => rej(new Error('File read failed'));
    r.readAsDataURL(blob);
  });

const getFileType = (url = '', mime = '') => {
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  if (mime.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) return 'image';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  return 'unknown';
};

// ─── Claude API ───────────────────────────────────────────────────────────────

async function callClaudeAPI({ textContent, fileBase64, fileMime, fileType }) {
  const contentParts = [];

  if (textContent?.trim()) {
    contentParts.push({ type: 'text', text: `DOCUMENT CONTENT:\n${textContent}` });
  }

  if (fileBase64 && fileType === 'pdf') {
    contentParts.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
    });
  } else if (fileBase64 && fileType === 'image') {
    contentParts.push({
      type: 'image',
      source: { type: 'base64', media_type: fileMime || 'image/jpeg', data: fileBase64 },
    });
  }

  contentParts.push({
    type: 'text',
    text: `Analyze ALL of the above — the written content AND the attached file — and produce a clear, insightful summary.

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "title": "A short topic title (max 8 words)",
  "bullets": [
    { "heading": "2–4 word label", "detail": "One clear sentence summarizing this point." }
  ]
}

Requirements:
- Generate 6 to 9 bullets total
- Pull insights from BOTH the text content AND the attached file
- Every bullet must cover a distinct point — no repetition
- Keep each "detail" under 130 characters
- Use plain, professional English`,
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: contentParts }],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  const raw = data.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Summary() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [article, setArticle]           = useState(null);
  const [summary, setSummary]           = useState(null);
  const [status, setStatus]             = useState('loading');
  const [errorMsg, setErrorMsg]         = useState('');
  const [visibleCount, setVisibleCount] = useState(0);
  const [fileInfo, setFileInfo]         = useState(null);
  const timerRef = useRef(null);

  // Stagger bullet reveal after done
  useEffect(() => {
    if (status === 'done' && summary?.bullets?.length) {
      setVisibleCount(0);
      let i = 0;
      timerRef.current = setInterval(() => {
        i++;
        setVisibleCount(i);
        if (i >= summary.bullets.length) clearInterval(timerRef.current);
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [status, summary]);

  // Main flow
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Step 1 — fetch article
        setStatus('loading');
        const res  = await fetch(`http://localhost:8000/articles/${id}`);
        const data = await res.json();
        if (cancelled) return;
        setArticle(data);

        // Step 2 — strip HTML body text
        const textContent = stripHtml(data.content_body || '');

        // Step 3 — fetch media_url attachment (the file on each post)
        let fileBase64 = null;
        let fileMime   = '';
        let fType      = 'unknown';

        if (data.media_url) {
          setStatus('fetching-file');
          try {
            const fileRes = await fetch(data.media_url);
            const blob    = await fileRes.blob();
            fileMime      = blob.type || '';
            fType         = getFileType(data.media_url, fileMime);

            if (fType === 'pdf' || fType === 'image') {
              fileBase64 = await toBase64(blob);
            }

            const fileName = data.media_url.split('/').pop().split('?')[0] || 'Attached File';
            setFileInfo({ name: fileName, type: fType.toUpperCase() });

          } catch (fileErr) {
            console.warn('Could not load media_url:', fileErr);
            setFileInfo({ name: 'File load failed', type: '?' });
          }
        }

        // Step 4 — call Claude with text + file
        setStatus('generating');
        const result = await callClaudeAPI({ textContent, fileBase64, fileMime, fileType: fType });
        if (cancelled) return;
        setSummary(result);
        setStatus('done');

      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setErrorMsg(err.message || 'Summarization failed. Please try again.');
        setStatus('error');
      }
    };

    run();
    return () => { cancelled = true; clearInterval(timerRef.current); };
  }, [id]);

  const statusLabel = {
    'loading':       'Fetching document…',
    'fetching-file': 'Loading attached file…',
    'generating':    'AI is reading & summarising…',
  }[status] || '';

  // Full-page spinner before article loads
  if (!article) {
    return (
      <div className="summary-page-container">
        <div className="summary-spinner-wrap">
          <div className="summary-spinner" />
          <p className="spinner-label">{statusLabel || 'Loading…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-page-container">
      <div className="summary-card">

        {/* Header */}
        <div className="summary-header">
          <div className="icon-badge">✨</div>
          <div className="header-text">
            <h1>AI Summary</h1>
            <p>
              <strong>{article.title}</strong>
              {article.content_type && <span className="type-chip">{article.content_type}</span>}
              {fileInfo
                ? <span className="attach-chip">📎 {fileInfo.name} · {fileInfo.type}</span>
                : article.media_url && <span className="attach-chip">📎 Attached file</span>
              }
            </p>
          </div>
          <button className="close-x-btn" onClick={() => navigate('/knowledge-base')}>×</button>
        </div>

        {/* Body */}
        <div className="summary-body">

          {/* Generating states */}
          {['fetching-file', 'generating'].includes(status) && (
            <div className="generating-state">
              <div className="pulse-ring" />
              <p className="generating-label">{statusLabel}</p>
              <div className="skeleton-bullets">
                {[75, 60, 85, 50, 70, 65].map((w, i) => (
                  <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.12}s` }}>
                    <div className="sk-dot" />
                    <div className="sk-bar" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <p>{errorMsg}</p>
              <button className="retry-btn" onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {/* Bullets */}
          {status === 'done' && summary && (
            <div className="bullets-wrap">
              {summary.title && <p className="summary-topic">{summary.title}</p>}
              <ul className="bullet-list">
                {summary.bullets.map((item, i) => (
                  <li
                    key={i}
                    className={`bullet-item ${i < visibleCount ? 'bullet-visible' : ''}`}
                  >
                    <span className="bullet-marker" aria-hidden="true" />
                    <div className="bullet-content">
                      <span className="bullet-heading">{item.heading}</span>
                      <span className="bullet-detail">{item.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="summary-footer">
          <div className="footer-meta">
            {article.creator && <span>Author: <strong>{article.creator}</strong></span>}
            {article.created_at && (
              <span>Date: <strong>{new Date(article.created_at).toLocaleDateString()}</strong></span>
            )}
            {status === 'done' && summary?.bullets && (
              <span className="bullet-count">{summary.bullets.length} key points</span>
            )}
          </div>
          <button className="read-full-btn" onClick={() => navigate(`/view/${id}`)}>
            Read Full Document →
          </button>
        </div>

      </div>
    </div>
  );
}