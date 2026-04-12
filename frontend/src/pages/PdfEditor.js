import React, { useState, useRef, useCallback } from 'react';
import './PdfEditor.css';

export default function PdfEditor() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  // Edit options
  const [editText, setEditText] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [posX, setPosX] = useState(72);
  const [posY, setPosY] = useState(700);
  const [fontSize, setFontSize] = useState(14);
  const [textColor, setTextColor] = useState('#000000');

  const fileInputRef = useRef();

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setMsg('');
    } else {
      setMsg('Only PDF files are supported.');
      setMsgType('error');
    }
  }, []);

  const handleApply = async () => {
    if (!file || !editText.trim()) return;
    setProcessing(true);
    setMsg('');
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();
      const pageIndex = Math.min(Math.max(Number(pageNum) - 1, 0), pages.length - 1);
      const page = pages[pageIndex];
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const hex = textColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      page.drawText(editText, {
        x: Number(posX),
        y: Number(posY),
        size: Number(fontSize),
        font,
        color: rgb(r, g, b),
      });
      const saved = await pdfDoc.save();
      const blob = new Blob([saved], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orlune_edited_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Text added. Your edited PDF downloaded successfully.');
      setMsgType('success');
    } catch (err) {
      console.error(err);
      setMsg('Could not process the PDF. Please try a different file.');
      setMsgType('error');
    }
    setProcessing(false);
  };

  return (
    <section className="pdfeditor-section">
      {/* Header */}
      <div className="pdfeditor-header">
        <div className="pdfeditor-badge">ORLUNE PDF EDIT</div>
        <h2 className="pdfeditor-title">PDF Editor</h2>
        <p className="pdfeditor-sub">
          Add text to any PDF, right in your browser. No uploads, no servers, no compromise.
        </p>
      </div>

      <div className="pdfeditor-card">
        {/* Drop zone */}
        <div
          className={`pdfeditor-dropzone ${dragOver ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) { setFile(f); setMsg(''); }
            }}
          />
          {file ? (
            <div className="pdfeditor-fileinfo">
              <div className="pdfeditor-fileicon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div className="pdfeditor-filemeta">
                <span className="pdfeditor-filename">{file.name}</span>
                <span className="pdfeditor-filesize">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button
                className="pdfeditor-fileremove"
                onClick={(e) => { e.stopPropagation(); setFile(null); setMsg(''); }}
                aria-label="Remove file"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ) : (
            <div className="pdfeditor-dropprompt">
              <div className="pdfeditor-dropicon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="11" x2="12" y2="17"/>
                  <polyline points="9 14 12 11 15 14"/>
                </svg>
              </div>
              <p className="pdfeditor-droptext">Drop your PDF here</p>
              <p className="pdfeditor-drophint">or click to select a file</p>
            </div>
          )}
        </div>

        {/* Controls — only show after file is selected */}
        {file && (
          <div className="pdfeditor-controls">
            <div className="pdfeditor-field full">
              <label>Text to Add</label>
              <input
                type="text"
                placeholder="Type the text you want to insert..."
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="pdfeditor-input"
              />
            </div>

            <div className="pdfeditor-grid">
              <div className="pdfeditor-field">
                <label>Page</label>
                <input type="number" min="1" value={pageNum} onChange={e => setPageNum(e.target.value)} className="pdfeditor-input" />
              </div>
              <div className="pdfeditor-field">
                <label>Font Size</label>
                <input type="number" min="6" max="120" value={fontSize} onChange={e => setFontSize(e.target.value)} className="pdfeditor-input" />
              </div>
              <div className="pdfeditor-field">
                <label>X Position</label>
                <input type="number" value={posX} onChange={e => setPosX(e.target.value)} className="pdfeditor-input" />
              </div>
              <div className="pdfeditor-field">
                <label>Y Position</label>
                <input type="number" value={posY} onChange={e => setPosY(e.target.value)} className="pdfeditor-input" />
              </div>
              <div className="pdfeditor-field">
                <label>Text Color</label>
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="pdfeditor-colorpick" />
              </div>
            </div>

            <button
              className={`pdfeditor-btn ${processing ? 'loading' : ''} ${!editText.trim() ? 'disabled' : ''}`}
              onClick={handleApply}
              disabled={processing || !editText.trim()}
            >
              {processing ? (
                <><span className="pdfeditor-spinner" />Applying Changes...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Apply &amp; Download PDF
                </>
              )}
            </button>

            {msg && (
              <div className={`pdfeditor-msg ${msgType}`}>
                {msgType === 'success' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
                {msg}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
