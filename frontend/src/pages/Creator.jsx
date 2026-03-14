import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import mammoth from "mammoth"; 
import * as pdfjsLib from 'pdfjs-dist'; 
import Tesseract from 'tesseract.js';
import './Creator.css';

// Set the worker source for PDF.js processing
const PDFJS_VERSION = '4.10.38'; 
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const Creator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const editor = useCreateBlockNote();

  // Load existing article if editing
  useEffect(() => {
    if (location.state && location.state.editArticle) {
      const { id, title, content_body } = location.state.editArticle;
      setTitle(title);
      setEditId(id);
      setIsEditing(true);
      
      const loadContent = async () => {
        const blocks = await editor.tryParseHTMLToBlocks(content_body);
        editor.replaceBlocks(editor.topLevelBlocks, blocks);
      };
      loadContent();
    }
  }, [location, editor]);

  // Handle Local File Upload (.md, .txt, .docx, .pdf)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const extension = fileName.split('.').pop().toLowerCase();
    
    // Set title based on filename
    setTitle(fileName.replace(/\.[^/.]+$/, ""));

    const reader = new FileReader();

    if (extension === 'pdf') {
      reader.onload = async (event) => {
        const typedarray = new Uint8Array(event.target.result);
        setIsProcessing(true); // Start loading state
        try {
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = "";
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');

            // If pageText is empty (scanned image), use Tesseract OCR
            if (!pageText.trim()) {
              console.log(`Page ${i} appears to be an image. Running OCR...`);
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              await page.render({ canvasContext: context, viewport: viewport }).promise;
              
              // Perform OCR on the rendered canvas image
              const { data: { text } } = await Tesseract.recognize(
                canvas.toDataURL('image/png'), 
                'eng'
              );
              fullText += text + "\n\n";
            } else {
              fullText += pageText + "\n\n";
            }
          }

          const blocks = await editor.tryParseMarkdownToBlocks(fullText);
          editor.replaceBlocks(editor.topLevelBlocks, blocks);
        } catch (err) {
          console.error("PDF/OCR Error:", err);
          alert("Error reading PDF content. The file may be corrupted or protected.");
        } finally {
          setIsProcessing(false); // End loading state
        }
      };
      reader.readAsArrayBuffer(file);
    

    } else if (extension === 'docx') {
      // Process Word Files
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
          const blocks = await editor.tryParseHTMLToBlocks(result.value);
          editor.replaceBlocks(editor.topLevelBlocks, blocks);
        } catch (err) {
          console.error("Mammoth conversion error:", err);
          alert("Error reading .docx file.");
        }
      };
      reader.readAsArrayBuffer(file);

    } else {
      // Process Markdown or Text Files
      reader.onload = async (event) => {
        const content = event.target.result;
        try {
          const blocks = await editor.tryParseMarkdownToBlocks(content);
          editor.replaceBlocks(editor.topLevelBlocks, blocks);
        } catch (err) {
          console.error("Markdown parse error:", err);
          alert("Error parsing file content.");
        }
      };
      reader.readAsText(file);
    }
    
    e.target.value = null; // Clear input
  };

  // Save/Update to FastAPI Backend
  const handleSave = async () => {
    if (!title.trim()) { 
      alert("Please enter a title."); 
      return; 
    }
    
    const htmlContent = await editor.blocksToFullHTML(editor.topLevelBlocks);
    const currentUser = localStorage.getItem("user") || "Admin";

    const payload = {
      title: title,
      content_body: htmlContent,
      creator: currentUser,
      status: 'draft',
      content_type: 'text',
      description: "Imported via DeltaBox Creator"
    };

    const url = isEditing ? `http://localhost:8000/articles/${editId}` : "http://localhost:8000/articles";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) { 
        alert("Saved to DeltaBox Database!");
        navigate('/database'); 
      } else {
        alert("Server Error: Check console for details.");
      }
    } catch (error) { 
      alert("Network error: Ensure FastAPI is running on port 8000.");
    }
  };

  return (
    <div className="zen-editor-root">
      <header className="zen-header">
        <div className="zen-header-left">
          <button className="zen-back-pill" onClick={() => navigate('/home')}>
            ← Home
          </button>
          
          <button 
            className="zen-back-pill upload-trigger" 
            onClick={() => fileInputRef.current.click()}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing OCR..." : "↑ Import File"}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".md,.txt,.docx,.pdf" 
            style={{ display: 'none' }} 
          />

          <div className="zen-divider" />
          <input 
            className="zen-title-input" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Untitled Document" 
          />
        </div>
        <div className="zen-header-right">
          <button className="zen-save-btn" onClick={handleSave}>
            {isEditing ? "Update" : "Save"}
          </button>
        </div>
      </header>

      <div className="zen-workspace">
        <div className="zen-paper-scroller">
          <div className="zen-paper-sheet fade-in">
            {/* Display processing status inside the document area */}
            {isProcessing && (
              <div style={{
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #007bff',
                borderRadius: '4px',
                textAlign: 'center',
                color: '#007bff',
                fontWeight: '600'
              }}>
                DeltaBox is analyzing your document... Please wait.
              </div>
            )}
            <BlockNoteView 
              editor={editor} 
              theme="light" 
              sideMenu={true} 
              formattingToolbar={true} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Creator;