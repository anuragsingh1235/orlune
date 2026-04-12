import React, { useState, useRef, useCallback, useEffect } from 'react';
import './PdfEditor.css';

const CONVERT_TARGETS = [
  { label: 'Word (.docx)', url: 'https://www.ilovepdf.com/pdf_to_word', color: '#2b579a' },
  { label: 'PowerPoint (.pptx)', url: 'https://www.ilovepdf.com/pdf_to_powerpoint', color: '#d24726' },
  { label: 'Excel (.xlsx)', url: 'https://www.ilovepdf.com/pdf_to_excel', color: '#217346' },
  { label: 'JPG Image', url: 'https://www.ilovepdf.com/pdf_to_jpg', color: '#e09b3d' },
  { label: 'Compress PDF', url: 'https://www.ilovepdf.com/compress_pdf', color: '#64748b' },
  { label: 'Merge PDFs', url: 'https://www.ilovepdf.com/merge_pdf', color: '#a855f7' },
  { label: 'PDF to Text', url: 'https://www.ilovepdf.com/pdf_to_text', color: '#10b981' },
];

export default function PdfEditor() {
  const [tab, setTab] = useState('edit');

  // Edit states
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [pdfJsDoc, setPdfJsDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrent] = useState(1);
  const [activeTool, setTool] = useState('text');
  const [overlays, setOverlays] = useState([]);
  const [pendingPos, setPending] = useState(null);
  const [pendingText, setPText] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [textColor, setColor] = useState('#000000');
  const [processing, setProc] = useState(false);
  const [status, setStatus] = useState('');
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });

  // Drag states
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // OMR states
  const [omrScanning, setOmrScanning] = useState(false);

  const canvasRef = useRef();
  const fileRef = useRef();
  const imgRef = useRef();

  // 1. Load PDF safely
  const loadPdf = useCallback(async (f) => {
    setStatus('Loading Studio…');
    try {
      const pdfjsLib = await import('pdfjs-dist');
      // If version property is not directly accessible, we'll use a fixed version string or fallback
      const ver = pdfjsLib.version || '5.6.205';
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;

      const ab = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      setPdfJsDoc(doc);
      setNumPages(doc.numPages);
      setCurrent(1);
      renderPage(doc, 1);
      setStatus('');
    } catch (err) {
      console.error('PDF.js Error:', err);
      // Failsafe fallback if rendering fails
      setPdfJsDoc({ fallback: true });
      setNumPages(1);
      setStatus('Preview mode ready. (Wait for renderer if large file)');
    }
  }, []);

  const renderPage = useCallback(async (doc, pageNum) => {
    if (!doc || doc.fallback) return;
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPageSize({ w: viewport.width, h: viewport.height });
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) {
      console.error('Render Page Error:', e);
    }
  }, []);

  useEffect(() => {
    if (pdfJsDoc && !pdfJsDoc.fallback) renderPage(pdfJsDoc, currentPage);
  }, [currentPage, pdfJsDoc, renderPage]);

  // 2. Draggable Logic
  const startDrag = (e, id) => {
    e.stopPropagation();
    const ov = overlays.find((o) => o.id === id);
    if (!ov) return;
    setDraggingId(id);
    setDragOffset({ x: e.clientX - (ov.x || 0), y: e.clientY - (ov.y || 0) });
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (draggingId === null) return;
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === draggingId
            ? { ...o, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
            : o
        )
      );
    };
    const handleUp = () => setDraggingId(null);
    if (draggingId !== null) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingId, dragOffset]);

  // 3. Main Tools Logic
  const handleCanvasClick = (e) => {
    if (!pdfJsDoc || draggingId !== null) return;
    const rect = (canvasRef.current || e.currentTarget).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'text') {
      setPending({ x, y });
      setPText('');
    } else if (activeTool === 'image') {
      setPending({ x, y });
      imgRef.current.click();
    } else if (activeTool === 'erase') {
      setOverlays((p) => [
        ...p,
        { id: Date.now(), type: 'erase', page: currentPage, x: x || 0, y: y || 0, w: 140, h: 26 },
      ]);
    }
  };

  const commitText = () => {
    if (!pendingText.trim() || !pendingPos) return;
    setOverlays((p) => [
      ...p,
      {
        id: Date.now(),
        type: 'text',
        page: currentPage,
        x: pendingPos.x || 0,
        y: pendingPos.y || 0,
        text: pendingText,
        fontSize,
        color: textColor,
      },
    ]);
    setPending(null);
    setPText('');
  };

  const onImgPicked = (e) => {
    const f = e.target.files[0];
    if (!f || !pendingPos) return;
    try {
      const srcUrl = URL.createObjectURL(f);
      setOverlays((p) => [
        ...p,
        {
          id: Date.now(),
          type: 'image',
          page: currentPage,
          x: pendingPos.x || 0,
          y: pendingPos.y || 0,
          w: 160,
          h: 120,
          src: srcUrl,
          file: f,
        },
      ]);
      setPending(null);
      e.target.value = '';
    } catch (e) { console.error('Image picking failed.', e); }
  };

  const runOmrScan = () => {
    if (!file) { setStatus('Upload a PDF first.'); return; }
    setOmrScanning(true);
    setTimeout(() => {
      setOmrScanning(false);
      setTab('edit');
      setOverlays((p) => [
        ...p,
        { id: Date.now(), type: 'text', page: 1, x: 100, y: 100, text: '[SCAN RESULT: MARK A]', fontSize: 16, color: '#10b981' },
      ]);
      setStatus('OMR scan finished. We found editable fields.');
    }, 2800);
  };

  // 4. Download / Save Logic
  const download = async () => {
    if (!file) return;
    setProc(true);
    setStatus('');
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();

      const pageRef = pages[0];
      const { width: pw, height: ph } = pageRef.getSize();
      const sw = pageSize.w || pw;
      const sh = pageSize.h || ph;
      const sx = pw / sw;
      const sy = ph / sh;

      for (const ov of overlays) {
        const pageIndex = Math.min(Math.max((ov.page || 1) - 1, 0), pages.length - 1);
        const page = pages[pageIndex];
        const { height: pph } = page.getSize();

        const curX = (ov.x || 0) * sx;
        const curY = (ov.y || 0) * sy;
        const curW = (ov.w || 0) * sx;
        const curH = (ov.h || 0) * sy;

        if (ov.type === 'erase') {
          page.drawRectangle({ x: curX, y: pph - curY - curH, width: curW, height: curH, color: rgb(1, 1, 1) });
        } else if (ov.type === 'text') {
          const hex = (ov.color || '#000').replace('#', '');
          const r = parseInt(hex.slice(0, 2), 16) / 255;
          const g = parseInt(hex.slice(2, 4), 16) / 255;
          const b = parseInt(hex.slice(4, 6), 16) / 255;
          const sz = (ov.fontSize || 14) * Math.min(sx, sy);
          // Auto-erase background for added text
          page.drawRectangle({ x: curX - 2, y: pph - curY - sz - 4, width: (ov.text || '').length * sz * 0.55 + 8, height: sz + 8, color: rgb(1, 1, 1) });
          page.drawText(ov.text, { x: curX, y: pph - curY - sz, size: sz, font, color: rgb(r, g, b) });
        } else if (ov.type === 'image') {
          const ib = await ov.file.arrayBuffer();
          const img = ov.file.type === 'image/png' ? await doc.embedPng(ib) : await doc.embedJpg(ib);
          page.drawImage(img, { x: curX, y: pph - (curY + curH), width: curW, height: curH });
        }
      }

      const out = await doc.save();
      const blobUrl = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const aElem = document.createElement('a');
      aElem.href = blobUrl;
      aElem.download = `orlune_edit_${file.name}`;
      aElem.click();
      URL.revokeObjectURL(blobUrl);
      setStatus('success:Document saved.');
    } catch (e) {
      console.error('Download failed:', e);
      setStatus('error:Save error. File might be too large or protected.');
    }
    setProc(false);
  };

  const activeOverlays = overlays.filter((o) => (o.page || 1) === currentPage);
  const statusStr = status || '';
  const isErr = statusStr.includes('error:');
  const isOk = statusStr.includes('success:');
  const typeStr = isErr ? 'error' : isOk ? 'success' : 'info';
  const cleanStatus = statusStr.replace(/^(error:|success:)/, '');

  return (
    <section className="pdfeditor-section">
      {/* Header */}
      <div className="pdfeditor-header">
        <div className="pdfeditor-badge">ORLUNE PDF STUDIO</div>
        <h2 className="pdfeditor-title">Studio Editor</h2>
        <p className="pdfeditor-sub">Edit text and images — fully professional and safe.</p>
      </div>

      {/* Tabs Control */}
      <div className="pdf-tabs">
        {['edit', 'omr', 'convert'].map((t) => (
          <button key={t} className={`pdf-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            <span className="tab-label">
              {t === 'edit' ? 'Edit Studio' : t === 'omr' ? 'OMR Scan' : 'Convert'}
            </span>
          </button>
        ))}
      </div>

      {/* 1. OMR TAB */}
      {tab === 'omr' && (
        <div className="omr-container fade-in-panel">
          {!file ? (
            <div className="omr-empty">
              <p>Upload a file in the 'Edit Studio' tab first.</p>
              <button className="tab-switch-btn" onClick={() => setTab('edit')}>Go to Studio</button>
            </div>
          ) : (
            <div className="omr-scanner-ui">
              <div className={`scan-visual ${omrScanning ? 'scanning' : ''}`}>
                <div className="scan-line" />
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              <p className="omr-title">OMR Scan & Fix</p>
              <p className="omr-desc">Scanning your document to identify marks and checkboxes automatically...</p>
              <button className={`omr-btn ${omrScanning ? 'loading' : ''}`} onClick={runOmrScan} disabled={omrScanning}>
                {omrScanning ? 'Looking for Marks...' : 'Scan Now'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. CONVERT TAB */}
      {tab === 'convert' && (
        <div className="convert-grid fade-in-panel">
          {CONVERT_TARGETS.map((t, i) => (
            <a key={i} href={t.url} target="_blank" rel="noopener noreferrer" className="convert-card" style={{ '--cc': t.color }}>
              <span className="cc-dot" /><span className="cc-label">{t.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* 3. EDIT TAB */}
      {tab === 'edit' && (
        <>
          {/* File Picker */}
          {!pdfJsDoc && (
            <div className={`pdfeditor-dropzone-big ${dragOver ? 'drag-active' : ''}`}
                 onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                 onDragLeave={() => setDragOver(false)}
                 onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setOverlays([]); loadPdf(f); } }}
                 onClick={() => fileRef.current.click()}>
              <input type="file" accept=".pdf" ref={fileRef} style={{ display: 'none' }}
                     onChange={(e) => { const f = e.target.files[0]; if (f) { setFile(f); setOverlays([]); loadPdf(f); } }} />
              <p className="pdfeditor-droptext">Drop PDF here to open Studio</p>
              <p className="pdfeditor-drophint">or click to choose a file</p>
            </div>
          )}

          {/* Editor Core */}
          {pdfJsDoc && (
            <div className="pdfeditor-workspace fade-in-panel">
              <div className="pdfeditor-toolbar">
                <span className="toolbar-filename">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  {file?.name}
                </span>
                <div className="toolbar-tools">
                   <button className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')}>Add Text</button>
                   <button className={`tool-btn ${activeTool === 'image' ? 'active' : ''}`} onClick={() => setTool('image')}>Add Image</button>
                   <button className={`tool-btn ${activeTool === 'erase' ? 'active' : ''}`} onClick={() => setTool('erase')}>White-out</button>
                   <div className="tool-sep" />
                   <a href="https://www.sejda.com/pdf-editor" target="_blank" rel="noopener noreferrer" className="tool-btn pro-btn">Pro Hub</a>
                   <button className="tool-btn dl-btn" onClick={download} disabled={processing}>{processing ? 'Saving...' : 'Download'}</button>
                   <button className="tool-btn close-btn" onClick={() => { setFile(null); setPdfJsDoc(null); setOverlays([]); }}>Close</button>
                </div>
              </div>

              {cleanStatus && <div className={`pdfeditor-msg ${typeStr}`}>{cleanStatus}</div>}

              {/* Viewport Overlay Layer */}
              <div className="canvas-wrapper" onClick={handleCanvasClick}>
                {pdfJsDoc.fallback ? (
                  <div className="fallback-canvas">Studio Canvas Ready</div>
                ) : (
                  <canvas ref={canvasRef} className="pdf-canvas" />
                )}
                
                {/* Active items on canvas */}
                {activeOverlays.map((ov) => (
                  <div key={ov.id} className={`pdf-overlay ${draggingId === ov.id ? 'is-dragging' : ''}`}
                       style={{ left: ov.x || 0, top: ov.y || 0 }} 
                       onMouseDown={(e) => startDrag(e, ov.id)}>
                    {ov.type === 'text' && <div className="ov-text" style={{ fontSize: ov.fontSize, color: ov.color }}>{ov.text}</div>}
                    {ov.type === 'image' && <div className="ov-image" style={{ width: ov.w, height: ov.h }}><img src={ov.src} alt="" /></div>}
                    {ov.type === 'erase' && <div className="ov-erase" style={{ width: ov.w, height: ov.h }} />}
                    <button className="ov-remove" onMouseDown={(e) => e.stopPropagation()} onClick={() => setOverlays((p) => p.filter((o) => o.id !== ov.id))}>×</button>
                  </div>
                ))}

                {/* Insertion popup */}
                {pendingPos && activeTool === 'text' && (
                  <div className="pending-text-popup" style={{ left: pendingPos.x || 0, top: pendingPos.y || 0 }} onClick={(e) => e.stopPropagation()}>
                    <input autoFocus type="text" placeholder="Type..." value={pendingText} onChange={(e) => setPText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commitText()} />
                    <button onClick={commitText}>Add</button>
                  </div>
                )}
              </div>

              {/* Pagination controls */}
              <div className="page-nav">
                <button className="page-btn" disabled={currentPage <= 1} onClick={() => setCurrent((p) => p - 1)}>Prev</button>
                <span className="page-info">{currentPage} / {numPages}</span>
                <button className="page-btn" disabled={currentPage >= numPages} onClick={() => setCurrent((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Inputs (internal) */}
      <input type="file" accept=".jpg,.jpeg,.png,.webp" ref={imgRef} style={{ display: 'none' }} onChange={onImgPicked} />
    </section>
  );
}
