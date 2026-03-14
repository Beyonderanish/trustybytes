import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Summary.css';

export default function Summary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [summaryItems, setSummaryItems] = useState([]);
  const [loadingText, setLoadingText] = useState("Analyzing document...");

  useEffect(() => {
    fetch(`http://localhost:8000/articles/${id}`)
      .then(res => res.json())
      .then(data => {
        setArticle(data);
        if (data && data.content_body) {
          extractSmartSummary(data.content_body);
        } else {
          setLoadingText("No content found to summarize.");
        }
      })
      .catch(err => {
        console.error(err);
        setLoadingText("Error loading document.");
      });
  }, [id]);

  // --- INTELLIGENT PARSER (Ensures Min 5 Items) ---
  const extractSmartSummary = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    let extracted = [];

    // --- STRATEGY 1: EXPLICIT HEADERS (Best Quality) ---
    const headers = tmp.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headers.length > 0) {
      headers.forEach(header => {
        let bodyText = "";
        let sibling = header.nextElementSibling;
        // Gather text until next header
        while (sibling && !['H1','H2','H3','H4','H5','H6'].includes(sibling.tagName)) {
           bodyText += sibling.textContent + " ";
           sibling = sibling.nextElementSibling;
           if (bodyText.length > 200) break; 
        }
        if (bodyText.trim().length > 15) {
          extracted.push({
            title: header.textContent.trim(),
            body: bodyText.trim()
          });
        }
      });
    }

    // --- STRATEGY 2: PATTERN MATCHING (If Headers missed or insufficient) ---
    if (extracted.length < 5) {
      const rawText = tmp.innerText || tmp.textContent;
      // Split by double newlines to find paragraphs
      const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 40);
      
      paragraphs.forEach(para => {
        const cleanPara = para.trim();
        // Regex for "1. Title" or "Title:" or "- Title"
        const match = cleanPara.match(/^(\d+\.?\s*|[-•]\s*)([^.:?!]+)([:.?!])(.*)/);
        
        if (match && match[2].length < 60) {
           extracted.push({
             title: match[2].trim(),
             body: match[4].trim() || cleanPara.substring(match[2].length + 5)
           });
        }
      });
    }

    // --- STRATEGY 3: FORCE FILL (If still < 5 items) ---
    // chunk remaining text to ensure we hit the minimum quota
    if (extracted.length < 5) {
       const rawText = tmp.innerText || tmp.textContent;
       // Clean up text
       const cleanText = rawText.replace(/\s+/g, ' ').trim();
       // Split into sentences
       const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
       
       let currentChunk = "";
       let sentenceCount = 0;
       
       // Create artificial sections from sentences
       for (let s of sentences) {
          if (extracted.length >= 9) break; // Stop if we have enough

          currentChunk += s + " ";
          sentenceCount++;

          // Every 3-4 sentences, make a new card
          if (sentenceCount >= 3 && currentChunk.length > 100) {
             const words = currentChunk.split(" ");
             // Create a "Topic" from the first 4-5 words
             const title = words.slice(0, 5).join(" ").replace(/[^\w\s]/gi, '') + "...";
             const body = currentChunk.trim();
             
             // Avoid duplicates
             if (!extracted.some(e => e.body.includes(body.substring(0, 20)))) {
                 extracted.push({ title, body });
             }
             currentChunk = "";
             sentenceCount = 0;
          }
       }
    }

    // --- FINAL CLEANUP & LIMITS ---
    // 1. Unique items only
    const uniqueItems = extracted.filter((v,i,a) => a.findIndex(t => t.body === v.body) === i);
    
    // 2. Format Text (Max 140 chars for body)
    const formattedItems = uniqueItems.map(item => ({
       title: item.title,
       body: item.body.length > 130 ? item.body.substring(0, 130) + "..." : item.body
    }));

    // 3. Slice to desired range (Min 5 (if possible), Max 9)
    // If we have fewer than 5, show all we found.
    setSummaryItems(formattedItems.slice(0, 9));
  };

  if (!article) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="summary-page-container">
      <div className="summary-card">
        <div className="summary-header">
          <div className="icon-badge">📑</div>
          <div>
            <h1>Structured Summary</h1>
            <p><strong>{article.title}</strong> • {article.content_type}</p>
          </div>
          <button className="close-x-btn" onClick={() => navigate('/knowledge-base')}>×</button>
        </div>

        <div className="summary-body">
          <div className="summary-grid">
             {summaryItems.length > 0 ? (
               summaryItems.map((item, index) => (
                 <div key={index} className="summary-item">
                   <div className="item-header">
                     <span className="item-dot"></span>
                     <h4 className="item-title">{item.title}</h4>
                   </div>
                   <p className="item-body">{item.body}</p>
                 </div>
               ))
             ) : (
               <div className="generated-text">{loadingText}</div>
             )}
          </div>
        </div>

        <div className="summary-footer">
          <div className="footer-meta">
            <span>Author: <strong>{article.creator}</strong></span>
            <span>Date: <strong>{new Date(article.created_at).toLocaleDateString()}</strong></span>
          </div>
          <button className="read-full-btn" onClick={() => navigate(`/view/${id}`)}>Read Full Document →</button>
        </div>
      </div>
    </div>
  );
}