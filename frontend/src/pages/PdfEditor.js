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
  { label: 'Word to PDF', url: 'https://www.ilovepdf.com/word_to_pdf', color: '#3b82f6' },
];

export default function PdfEditor() {
  const [tab, setTab] = useState('edit'); // 'edit' | 'convert'

  // Edit state
  const [file, setFile]           = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [pdfJsDoc, setPdfJsDoc]   = useState(null);
  const [numPages, setNumPages]   = useState(0);
  const [currentPage, setCurrent] = useState(1);
  const [activeTool, setTool]     = useState('text');
  const [overlays, setOverlays]   = useState([]);
  const [pendingPos, setPending]  = useState(null);
  const [pendingText, setPText]   = useState('');
  const [fontSize, setFontSize]   = useState(14);
  const [textColor, setColor]     = useState('#000000');
  const [processing, setProc]     = useState(false);
  const [status, setStatus]       = useState('');
  const [pageSize, setPageSize]   = useState({ w: 0, h: 0 });

  const canvasRef  = useRef();
  const fileRef    = useRef();
  const imgRef     = useRef();

  // ── Load PDF with the bundled worker ───────────────────────────────
  const loadPdf = useCallback(async (f) => {
    setStatus('Loading PDF…');
    try {
      const pdfjsLib = await import('pdfjs-dist');
      // v5 ships the worker at this path — point to it via URL so no bundler issues
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
      const ab  = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      setPdfJsDoc(doc);
      setNumPages(doc.numPages);
      setCurrent(1);
      renderPage(doc, 1);
      setStatus('');
    } catch (err) {
      console.error(err);
      setPdfJsDoc({ fallback: true });
      setNumPages(1);
      setStatus('PDF loaded. Add text or images, then download.');
    }
  }, []);

  const renderPage = useCallback(async (doc, pageNum) => {
    if (!doc || doc.fallback) return;
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      setPageSize({ w: viewport.width, h: viewport.height });
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (pdfJsDoc && !pdfJsDoc.fallback) renderPage(pdfJsDoc, currentPage);
  }, [currentPage, pdfJsDoc, renderPage]);

  // ── Drag & Drop ──────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') { setFile(f); setOverlays([]); loadPdf(f); }
    else setStatus('Please drop a valid PDF file.');
  }, [loadPdf]);

  // ── Canvas click → place overlay ────────────────────────────────
  const handleCanvasClick = (e) => {
    if (!pdfJsDoc) return;
    const rect = (canvasRef.current || e.currentTarget).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (activeTool === 'text') { setPending({ x, y }); setPText(''); }
    else if (activeTool === 'image') { setPending({ x, y }); imgRef.current.click(); }
    else if (activeTool === 'erase') {
      setOverlays(p => [...p, { id: Date.now(), type: 'erase', page: currentPage, x, y, w: 140, h: 26 }]);
    }
  };

  const commitText = () => {
    if (!pendingText.trim() || !pendingPos) return;
    setOverlays(p => [...p, { id: Date.now(), type: 'text', page: currentPage, x: pendingPos.x, y: pendingPos.y, text: pendingText, fontSize, color: textColor }]);
    setPending(null); setPText('');
  };

  const onImgPicked = (e) => {
    const f = e.target.files[0];
    if (!f || !pendingPos) return;
    setOverlays(p => [...p, { id: Date.now(), type: 'image', page: currentPage, x: pendingPos.x, y: pendingPos.y, w: 160, h: 120, src: URL.createObjectURL(f), file: f }]);
    setPending(null); e.target.value = '';
  };

  // ── Download ─────────────────────────────────────────────────────
  const download = async () => {
    if (!file) return;
    setProc(true); setStatus('');
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const bytes = await file.arrayBuffer();
      const doc   = await PDFDocument.load(bytes);
      const font  = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();

      // Get actual page size from pdf-lib for accurate scaling
      const refPage = pages[0];
      const { width: pw, height: ph } = refPage.getSize();
      const cw = pageSize.w || pw;
      const ch = pageSize.h || ph;
      const sx = pw / cw;
      const sy = ph / ch;

      for (const ov of overlays) {
        const page = pages[Math.min(ov.page - 1, pages.length - 1)];
        const { height: pph } = page.getSize();
        if (ov.type === 'erase') {
          page.drawRectangle({ x: ov.x * sx, y: pph - ov.y * sy - ov.h * sy, width: ov.w * sx, height: ov.h * sy, color: rgb(1, 1, 1) });
        } else if (ov.type === 'text') {
          const hex = ov.color.replace('#', '');
          const r = parseInt(hex.slice(0,2),16)/255, g = parseInt(hex.slice(2,4),16)/255, b = parseInt(hex.slice(4,6),16)/255;
          const sz = ov.fontSize * Math.min(sx, sy);
          page.drawRectangle({ x: ov.x*sx-2, y: pph-ov.y*sy-sz-4, width: ov.text.length*sz*0.55+8, height: sz+8, color: rgb(1,1,1) });
          page.drawText(ov.text, { x: ov.x*sx, y: pph-ov.y*sy-sz, size: sz, font, color: rgb(r,g,b) });
        } else if (ov.type === 'image') {
          const ib = await ov.file.arrayBuffer();
          const img = ov.file.type === 'image/png' ? await doc.embedPng(ib) : await doc.embedJpg(ib);
          page.drawImage(img, { x: ov.x*sx, y: pph-(ov.y+ov.h)*sy, width: ov.w*sx, height: ov.h*sy });
        }
      }

      const out  = await doc.save();
      const url  = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const a    = document.createElement('a');
      a.href = url; a.download = `orlune_edited_${file.name}`; a.click();
      URL.revokeObjectURL(url);
      setStatus('success:PDF downloaded with all changes.');
    } catch (e) {
      console.error(e);
      setStatus('error:Something went wrong. Try a different PDF.');
    }
    setProc(false);
  };

  const curOverlays = overlays.filter(o => o.page === currentPage);
  const statusType  = status.startsWith('success:') ? 'success' : status.startsWith('error:') ? 'error' : 'info';
  const statusText  = status.replace(/^(success:|error:)/, '');

  return (
    <section className="pdfeditor-section">
      {/* Header */}
      <div className="pdfeditor-header">
        <div className="pdfeditor-badge">ORLUNE PDF EDIT</div>
        <h2 className="pdfeditor-title">PDF Studio</h2>
        <p className="pdfeditor-sub">Convert, edit text and images inside any PDF — right here.</p>
      </div>

      {/* Tabs */}
      <div className="pdf-tabs">
        <button className={`pdf-tab ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit PDF
        </button>
        <button className={`pdf-tab ${tab === 'convert' ? 'active' : ''}`} onClick={() => setTab('convert')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          Convert
        </button>
      </div>

      {/* ── CONVERT TAB ── */}
      {tab === 'convert' && (
        <div className="convert-grid fade-in-panel">
          <p className="convert-hint">Click any option below — it opens a reliable converter where you can upload your file.</p>
          {CONVERT_TARGETS.map((t, i) => (
            <a key={i} href={t.url} target="_blank" rel="noopener noreferrer"
               className="convert-card" style={{ '--cc': t.color }}>
              <span className="cc-dot" />
              <span className="cc-label">{t.label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          ))}
        </div>
      )}

      {/* ── EDIT TAB ── */}
      {tab === 'edit' && (
        <>
          {/* Drop Zone */}
          {!pdfJsDoc && (
            <div className={`pdfeditor-dropzone-big ${dragOver ? 'drag-active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}>
              <input type="file" accept=".pdf" ref={fileRef} style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setOverlays([]); loadPdf(f); } }} />
              <div className="pdfeditor-dropicon-big">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="11" x2="12" y2="17"/>
                  <polyline points="9 14 12 11 15 14"/>
                </svg>
              </div>
              {status && statusType === 'info'
                ? <p className="pdfeditor-droptext">{statusText}</p>
                : <><p className="pdfeditor-droptext">Drop your PDF here to edit</p><p className="pdfeditor-drophint">or click to browse</p></>
              }
            </div>
          )}

          {/* Workspace */}
          {pdfJsDoc && (
            <div className="pdfeditor-workspace fade-in-panel">

              {/* Toolbar */}
              <div className="pdfeditor-toolbar">
                <span className="toolbar-filename">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  {file?.name}
                </span>
                <div className="toolbar-tools">
                  {[
                    { id: 'text',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>, label: 'Text' },
                    { id: 'image', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label: 'Image' },
                    { id: 'erase', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><path d="M6.0001 17.9999L10 14"/></svg>, label: 'Erase' },
                  ].map(t => (
                    <button key={t.id} className={`tool-btn ${activeTool === t.id ? 'active' : ''}`} onClick={() => setTool(t.id)}>
                      {t.icon}{t.label}
                    </button>
                  ))}
                  {activeTool === 'text' && (
                    <>
                      <div className="tool-sep" />
                      <input type="number" min="6" max="120" value={fontSize} onChange={e => setFontSize(+e.target.value)} className="tool-input-num" title="Font size" />
                      <input type="color" value={textColor} onChange={e => setColor(e.target.value)} className="tool-color" title="Text color" />
                    </>
                  )}
                  <div className="tool-sep" />
                  <button className="tool-btn dl-btn" onClick={download} disabled={processing}>
                    {processing
                      ? <><span className="pdfeditor-spinner" />Saving...</>
                      : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</>}
                  </button>
                  <button className="tool-btn close-btn" onClick={() => { setFile(null); setPdfJsDoc(null); setOverlays([]); setStatus(''); }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Close
                  </button>
                </div>
              </div>

              {status && statusType !== 'info' && (
                <div className={`pdfeditor-msg ${statusType}`}>{statusText}</div>
              )}

              {/* Page nav */}
              {numPages > 1 && (
                <div className="page-nav">
                  <button className="page-btn" disabled={currentPage <= 1} onClick={() => setCurrent(p => p - 1)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span className="page-info">Page {currentPage} / {numPages}</span>
                  <button className="page-btn" disabled={currentPage >= numPages} onClick={() => setCurrent(p => p + 1)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}

              {/* Canvas + overlay */}
              <div className="canvas-wrapper" onClick={handleCanvasClick}>
                {pdfJsDoc.fallback ? (
                  <div className="fallback-canvas">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <p>{file?.name}</p>
                    <span>Click anywhere to add text. Select Image to insert an image. Download to save.</span>
                  </div>
                ) : (
                  <canvas ref={canvasRef} className="pdf-canvas" />
                )}

                {/* Overlays */}
                {curOverlays.map(ov => (
                  <div key={ov.id} className="pdf-overlay" style={{ left: ov.x, top: ov.y }} onClick={e => e.stopPropagation()}>
                    {ov.type === 'text' && (
                      <div className="ov-text" style={{ fontSize: ov.fontSize, color: ov.color }}>
                        {ov.text}<button className="ov-remove" onClick={() => setOverlays(p => p.filter(o => o.id !== ov.id))}>×</button>
                      </div>
                    )}
                    {ov.type === 'image' && (
                      <div className="ov-image" style={{ width: ov.w, height: ov.h }}>
                        <img src={ov.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button className="ov-remove" onClick={() => setOverlays(p => p.filter(o => o.id !== ov.id))}>×</button>
                      </div>
                    )}
                    {ov.type === 'erase' && (
                      <div className="ov-erase" style={{ width: ov.w, height: ov.h }}>
                        <span className="ov-erase-label">erased</span>
                        <button className="ov-remove" onClick={() => setOverlays(p => p.filter(o => o.id !== ov.id))}>×</button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Pending text popup */}
                {pendingPos && activeTool === 'text' && (
                  <div className="pending-text-popup" style={{ left: pendingPos.x, top: pendingPos.y }} onClick={e => e.stopPropagation()}>
                    <input autoFocus type="text" placeholder="Type text..." value={pendingText}
                      onChange={e => setPText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setPending(null); }}
                      className="pending-text-input" style={{ fontSize }} />
                    <div className="pending-actions">
                      <button className="pending-ok" onClick={commitText}>Add</button>
                      <button className="pending-cancel" onClick={() => setPending(null)}>×</button>
                    </div>
                  </div>
                )}
              </div>

              <input type="file" accept=".jpg,.jpeg,.png,.webp" ref={imgRef} style={{ display: 'none' }} onChange={onImgPicked} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
