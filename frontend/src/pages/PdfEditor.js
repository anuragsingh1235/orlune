import React, { useState, useRef, useCallback, useEffect } from 'react';
import './PdfEditor.css';

export default function PdfEditor() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTool, setActiveTool] = useState('text'); // 'text' | 'image' | 'erase'
  const [overlays, setOverlays] = useState([]);
  const [pendingPos, setPendingPos] = useState(null); // {x, y}
  const [pendingText, setPendingText] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [textColor, setTextColor] = useState('#000000');
  const [selectedOverlay, setSelectedOverlay] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');

  const canvasRef = useRef();
  const fileInputRef = useRef();
  const imgInputRef = useRef();
  const SCALE = 1.5;

  // ─── Load PDF ────────────────────────────────────────────────────────────
  const loadPdf = useCallback(async (f) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const ab = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: ab }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      renderPage(doc, 1);
    } catch (e) {
      console.error(e);
      setMsg('Could not open this PDF.');
    }
  }, []);

  const renderPage = useCallback(async (doc, pageNum) => {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    setCanvasSize({ w: viewport.width, h: viewport.height });
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
  }, []);

  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, currentPage);
  }, [currentPage, pdfDoc, renderPage]);

  // ─── Drag / Drop ─────────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') { setFile(f); setOverlays([]); setMsg(''); loadPdf(f); }
    else setMsg('Only PDF files are supported.');
  }, [loadPdf]);

  // ─── Canvas click → place overlay ────────────────────────────────────────
  const handleCanvasClick = (e) => {
    if (!pdfDoc) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'text') {
      setPendingPos({ x, y });
      setPendingText('');
    } else if (activeTool === 'image') {
      setPendingPos({ x, y });
      imgInputRef.current.click();
    } else if (activeTool === 'erase') {
      // Add a white eraser rect
      setOverlays(prev => [...prev, {
        id: Date.now(), type: 'erase', page: currentPage,
        x, y, width: 120, height: 24
      }]);
    }
  };

  // ─── Commit text overlay ─────────────────────────────────────────────────
  const commitText = () => {
    if (!pendingText.trim() || !pendingPos) return;
    setOverlays(prev => [...prev, {
      id: Date.now(), type: 'text', page: currentPage,
      x: pendingPos.x, y: pendingPos.y,
      text: pendingText, fontSize, color: textColor
    }]);
    setPendingPos(null);
    setPendingText('');
  };

  // ─── Image overlay via picker ─────────────────────────────────────────────
  const handleImgPicked = (e) => {
    const f = e.target.files[0];
    if (!f || !pendingPos) return;
    const url = URL.createObjectURL(f);
    setOverlays(prev => [...prev, {
      id: Date.now(), type: 'image', page: currentPage,
      x: pendingPos.x, y: pendingPos.y,
      width: 160, height: 120, src: url, file: f
    }]);
    setPendingPos(null);
    e.target.value = '';
  };

  // ─── Remove overlay ───────────────────────────────────────────────────────
  const removeOverlay = (id) => setOverlays(prev => prev.filter(o => o.id !== id));

  // ─── Download PDF with changes ─────────────────────────────────────────────
  const downloadPdf = async () => {
    if (!file) return;
    setProcessing(true);
    setMsg('');
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = doc.getPages();
      const font = await doc.embedFont(StandardFonts.Helvetica);

      for (const ov of overlays) {
        const page = pages[ov.page - 1];
        if (!page) continue;
        const { width: pw, height: ph } = page.getSize();
        const sx = pw / canvasSize.w;
        const sy = ph / canvasSize.h;

        if (ov.type === 'erase') {
          page.drawRectangle({
            x: ov.x * sx, y: ph - ov.y * sy - ov.height * sy,
            width: ov.width * sx, height: ov.height * sy,
            color: rgb(1, 1, 1)
          });
        } else if (ov.type === 'text') {
          const hex = ov.color.replace('#', '');
          const r = parseInt(hex.slice(0, 2), 16) / 255;
          const g = parseInt(hex.slice(2, 4), 16) / 255;
          const b = parseInt(hex.slice(4, 6), 16) / 255;
          // Cover old text with white
          page.drawRectangle({
            x: ov.x * sx - 2,
            y: ph - ov.y * sy - ov.fontSize * sy - 4,
            width: ov.text.length * ov.fontSize * 0.55 * sx + 8,
            height: ov.fontSize * sy + 8,
            color: rgb(1, 1, 1)
          });
          page.drawText(ov.text, {
            x: ov.x * sx,
            y: ph - ov.y * sy - ov.fontSize * sy,
            size: ov.fontSize * Math.min(sx, sy),
            font,
            color: rgb(r, g, b)
          });
        } else if (ov.type === 'image') {
          const imgBytes = await ov.file.arrayBuffer();
          const img = ov.file.type === 'image/png'
            ? await doc.embedPng(imgBytes)
            : await doc.embedJpg(imgBytes);
          page.drawImage(img, {
            x: ov.x * sx,
            y: ph - (ov.y + ov.height) * sy,
            width: ov.width * sx,
            height: ov.height * sy
          });
        }
      }

      const saved = await doc.save();
      const blob = new Blob([saved], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orlune_edited_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('PDF downloaded with all changes applied.');
    } catch (err) {
      console.error(err);
      setMsg('An error occurred. Please try again.');
    }
    setProcessing(false);
  };

  const currentOverlays = overlays.filter(o => o.page === currentPage);

  return (
    <section className="pdfeditor-section">
      {/* Header */}
      <div className="pdfeditor-header">
        <div className="pdfeditor-badge">ORLUNE PDF EDIT</div>
        <h2 className="pdfeditor-title">PDF Editor</h2>
        <p className="pdfeditor-sub">
          Open any PDF, edit text, replace images, erase content — then download.
        </p>
      </div>

      {/* Drop Zone (shown before file selected) */}
      {!file && (
        <div
          className={`pdfeditor-dropzone-big ${dragOver ? 'drag-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input type="file" accept=".pdf" ref={fileInputRef} style={{ display: 'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setOverlays([]); setMsg(''); loadPdf(f); } }} />
          <div className="pdfeditor-dropicon-big">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <polyline points="9 14 12 11 15 14"/>
            </svg>
          </div>
          <p className="pdfeditor-droptext">Drop your PDF here to start editing</p>
          <p className="pdfeditor-drophint">or click to browse</p>
        </div>
      )}

      {msg && !file && <p className="pdfeditor-msg error">{msg}</p>}

      {/* Editor Workspace */}
      {file && pdfDoc && (
        <div className="pdfeditor-workspace">

          {/* Toolbar */}
          <div className="pdfeditor-toolbar">
            <div className="toolbar-left">
              <span className="toolbar-filename">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {file.name}
              </span>
            </div>

            <div className="toolbar-tools">
              <button className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`} onClick={() => setActiveTool('text')} title="Add / Edit Text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                Text
              </button>
              <button className={`tool-btn ${activeTool === 'image' ? 'active' : ''}`} onClick={() => setActiveTool('image')} title="Place Image">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Image
              </button>
              <button className={`tool-btn ${activeTool === 'erase' ? 'active' : ''}`} onClick={() => setActiveTool('erase')} title="Erase Content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                Erase
              </button>

              {activeTool === 'text' && (
                <>
                  <div className="tool-sep" />
                  <div className="tool-control">
                    <label>Size</label>
                    <input type="number" min="6" max="120" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="tool-input-num" />
                  </div>
                  <div className="tool-control">
                    <label>Color</label>
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="tool-color" />
                  </div>
                </>
              )}

              <div className="tool-sep" />

              <button className={`tool-btn download-btn ${processing ? 'loading' : ''}`} onClick={downloadPdf} disabled={processing}>
                {processing ? <><span className="pdfeditor-spinner" />Saving...</>
                  : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</>}
              </button>

              <button className="tool-btn close-btn" onClick={() => { setFile(null); setPdfDoc(null); setOverlays([]); setMsg(''); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Close
              </button>
            </div>
          </div>

          {msg && <div className={`pdfeditor-msg ${msg.includes('error') || msg.includes('Could') ? 'error' : 'success'}`}>{msg}</div>}

          {/* Page nav */}
          <div className="page-nav">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="page-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="page-info">Page {currentPage} / {numPages}</span>
            <button disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)} className="page-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Canvas + Edit Layer */}
          <div className="canvas-wrapper" onClick={handleCanvasClick}>
            <canvas ref={canvasRef} className="pdf-canvas" />

            {/* Overlay elements for current page */}
            {currentOverlays.map(ov => (
              <div
                key={ov.id}
                className="pdf-overlay"
                style={{ left: ov.x, top: ov.y }}
                onClick={e => e.stopPropagation()}
              >
                {ov.type === 'text' && (
                  <div className="ov-text" style={{ fontSize: ov.fontSize, color: ov.color }}>
                    {ov.text}
                    <button className="ov-remove" onClick={() => removeOverlay(ov.id)}>×</button>
                  </div>
                )}
                {ov.type === 'image' && (
                  <div className="ov-image" style={{ width: ov.width, height: ov.height }}>
                    <img src={ov.src} alt="overlay" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button className="ov-remove" onClick={() => removeOverlay(ov.id)}>×</button>
                  </div>
                )}
                {ov.type === 'erase' && (
                  <div className="ov-erase" style={{ width: ov.width, height: ov.height }}>
                    <span className="ov-erase-label">Erased</span>
                    <button className="ov-remove" onClick={() => removeOverlay(ov.id)}>×</button>
                  </div>
                )}
              </div>
            ))}

            {/* Pending text input popup */}
            {pendingPos && activeTool === 'text' && (
              <div
                className="pending-text-popup"
                style={{ left: pendingPos.x, top: pendingPos.y }}
                onClick={e => e.stopPropagation()}
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Type text here..."
                  value={pendingText}
                  onChange={e => setPendingText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setPendingPos(null); }}
                  className="pending-text-input"
                  style={{ fontSize }}
                />
                <div className="pending-actions">
                  <button className="pending-ok" onClick={commitText}>Add</button>
                  <button className="pending-cancel" onClick={() => setPendingPos(null)}>×</button>
                </div>
              </div>
            )}
          </div>

          <input type="file" accept=".jpg,.jpeg,.png,.webp" ref={imgInputRef} style={{ display: 'none' }} onChange={handleImgPicked} />
        </div>
      )}
    </section>
  );
}
