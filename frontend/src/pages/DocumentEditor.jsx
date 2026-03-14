import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill-new";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";

import "react-quill-new/dist/quill.snow.css";
import "./DocumentEditor.css";

// Reads the exact version from the installed package — always in sync, no dynamic imports
// unpkg mirrors npm exactly — always has the installed version unlike cdnjs
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function DocumentEditor() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [id]);

  /* ---------------- LOAD DOCUMENT ---------------- */

  const loadDocument = async () => {
    try {

      const res = await fetch(`http://localhost:8000/articles/${id}`);
      const data = await res.json();

      setTitle(data.title || "Untitled Document");

      if (data.media_url) {
        setIsProcessing(true);

        // Strip query params / hash before reading the extension
        const cleanUrl = data.media_url.split("?")[0].split("#")[0];
        const ext = cleanUrl.split(".").pop().toLowerCase();

        if (ext === "pdf") {

          // Pass the URL directly to pdfjsLib — avoids a CORS-blocked double-fetch
          const html = await extractPDF(data.media_url);
          setContent(html);

        } else {

          // For non-PDF files we still fetch the blob
          const fileRes = await fetch(data.media_url);

          if (!fileRes.ok) {
            throw new Error(`Failed to fetch file: ${fileRes.status} ${fileRes.statusText}`);
          }

          const blob = await fileRes.blob();

          if (ext === "docx") {

            const buffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
            setContent(result.value);

          } else {

            const text = await blob.text();
            setContent(text.replace(/\n/g, "<br/>"));

          }
        }

      } else {
        setContent(data.content_body || "");
      }

    } catch (err) {

      console.error("loadDocument error:", err);
      alert(`Failed to load document: ${err.message}`);

    } finally {

      setIsLoading(false);
      setIsProcessing(false);

    }
  };

  /* ---------------- PDF EXTRACTION ---------------- */

  // Accepts a URL string — pdfjsLib fetches it internally, bypassing CORS issues
  const extractPDF = async (url) => {

    const loadingTask = pdfjsLib.getDocument({
      url,
      // Suppress non-critical "unknown" annotation warnings in the console
      verbosity: 0,
    });

    const pdf = await loadingTask.promise;

    let html = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      let pageText = "";

      textContent.items.forEach((item) => {
        pageText += item.str + " ";
      });

      /* OCR fallback for image-based / scanned pages */

      if (pageText.trim().length < 20) {

        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const result = await Tesseract.recognize(canvas.toDataURL(), "eng");
        pageText = result.data.text;
      }

      html += `<p>${pageText}</p><hr/>`;

    }

    return html;
  };

  /* ---------------- SAVE DOCUMENT ---------------- */

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build an .html file from the edited content and upload it
      // to replace the attachment — does NOT touch content_body/description
      const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${title}</title></head>
<body>${content}</body>
</html>`;

      const safeTitle = title.replace(/[^a-z0-9]/gi, "_");
      const htmlBlob = new Blob([htmlContent], { type: "text/html" });
      const htmlFile = new File(
        [htmlBlob],
        `${safeTitle}_edited.html`,
        { type: "text/html" }
      );

      const formData = new FormData();
      formData.append("title", title);
      formData.append("file", htmlFile);

      const res = await fetch(
        `http://localhost:8000/articles/${id}/replace-file`,
        { method: "PUT", body: formData }
      );

      if (res.ok) {
        alert("Document saved — attachment updated successfully");
        navigate(-1); // Return to EditPost which re-fetches fresh data
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Save failed: ${res.status} ${errData.detail || ""}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------- EDITOR TOOLBAR ---------------- */

  const modules = React.useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      ["link", "image"],
      ["clean"]
    ]
  }), []);

  /* ---------------- UI ---------------- */


  return (

    <div className="editor-container">

      <header className="editor-header">

        <button
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <input
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <button
          className="save-btn"
          onClick={handleSave}
          disabled={isSaving || isProcessing}
        >
          {isSaving ? "Saving..." : "💾 Save"}
        </button>

      </header>

      <div className="editor-workspace">

        {isLoading ? (

          <div className="loading">
            Loading Document...
          </div>

        ) : (

          <div className="document-paper">

            {isProcessing && (
              <div className="processing">
                Extracting document...
              </div>
            )}

            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
            />

          </div>

        )}

      </div>

    </div>

  );

}