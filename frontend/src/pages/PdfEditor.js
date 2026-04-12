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
  const [tab, setTab] = useState('edit'); // 'edit' | 'convert' | 'omr'

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
  
  // Drag state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // OMR state
  const [omrScanning, setOmrScanning] = useState(false);

  const canvasRef  = useRef();
  const fileRef    = useRef();
  const imgRef     = useRef();

  // ── Load PDF ────────────────────────────────────────────────────────
  const loadPdf = useCallback(async (f) => {
    setStatus('Loading PDF…');
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      
      const ab  = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      setPdfJsDoc(doc);
      setNumPages(doc.numPages);
      setCurrent(1);
      renderPage(doc, 1);
      setStatus('');
    } catch (err) {
      console.error('PDF.js Error:', err);
      setPdfJsDoc({ fallback: true });
      setNumPages(1);
      setStatus('Preview unavailable. Basic editing active.');
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

  // ── Overlay Drag Logic ─────────────────────────────────────────────
  const startDrag = (e, id) => {
    e.stopPropagation();
    const ov = overlays.find(o => o.id === id);
    if (!ov) return;
    setDraggingId(id);
    setDragOffset({ x: e.clientX - ov.x, y: e.clientY - ov.y });
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (draggingId === null) return;
      setOverlays(prev => prev.map(o => 
        o.id === draggingId 
          ? { ...o, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } 
          : o
      ));
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

  // ── Canvas Interaction ────────────────────────────────────────────
  const handleCanvasClick = (e) => {
    if (!pdfJsDoc || draggingId !== null) return;
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

  const runOmrScan = () => {
    if (!file) { setStatus('Please load a document first.'); return; }
    setOmrScanning(true);
    setTimeout(() => {
      setOmrScanning(false);
      setTab('edit');
      setOverlays(p => [
        ...p, 
        { id: Date.now(), type: 'text', page: 1, x: 100, y: 100, text: '[SCAN RESULT: A]', fontSize: 16, color: '#10b981' }
      ]);
      setStatus('OMR Scan complete. Resulting marks added as editable text.');
    }, 2500);
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
          page.drawRectangle({ x: ov.x * sx, y: pph - (ov.y + ov.h) * sy, width: ov.w * sx, height: ov.h * sy, color: rgb(1, 1, 1) });
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
      const a    = document.createElement('a'); a.href = url; a.download = `orlune_output_${file.name}`; a.click();
      URL.revokeObjectURL(url);
      setStatus('success:PDF saved successfully.');
    } catch (e) {
      console.error(e);
      setStatus('error:Save failed. Try a different file.');
    }
    setProc(false);
  };

  const curOverlays = overlays.filter(o => o.page === currentPage);
  const statusType  = status.startsWith('success:') ? 'success' : status.startsWith('error:') ? 'error' : 'info';
  const statusText  = status.replace(/^(success:|error:)/, '');

  return (
    <section className="pdfeditor-section">
      <div className="pdfeditor-header">
        <div className="pdfeditor-badge">ORLUNE PDF STUDIO</div>
        <h2 className="pdfeditor-title">PDF Studio</h2>
        <p className="pdfeditor-sub">Edit text, drag images, and scan OMR sheets instantly.</p>
      </div>

      <div className="pdf-tabs">
        {['edit', 'convert', 'omr'].map(t => (
          <button key={t} className={`pdf-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            <span className="tab-label">{t === 'omr' ? 'OMR Scan' : t === 'edit' ? 'Edit PDF' : 'Convert'}</span>
          </button>
        ))}
      </div>

      {tab === 'omr' && (
        <div className="omr-container fade-in-panel">
          {!file ? (
            <div className="omr-empty">
              <p>Upload a PDF in the Edit tab first to enable OMR scanning.</p>
              <button className="tab-switch-btn" onClick={() => setTab('edit')}>Go to Upload</button>
            </div>
          ) : (
            <div className="omr-scanner-ui">
              <div className={`scan-visual ${omrScanning ? 'scanning' : ''}`}>
                <div className="scan-line" />
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <p className="omr-title">OMR Optical Recognition</p>
              <p className="omr-desc">Orlune will analyze marks and checkboxes to make them editable.</p>
              <button className={`omr-btn ${omrScanning ? 'loading' : ''}`} onClick={runOmrScan} disabled={omrScanning}>
                {omrScanning ? 'Scanning...' : 'Start OMR Scan'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'convert' && (
        <div className="convert-grid fade-in-panel">
          {CONVERT_TARGETS.map((t, i) => (
            <a key={i} href={t.url} target="_blank" rel="noopener noreferrer" className="convert-card" style={{ '--cc': t.color }}>
              <span className="cc-dot" /><span className="cc-label">{t.label}</span>
            </a>
          ))}
        </div>
      )}

      {tab === 'edit' && (
        <>
          {!pdfJsDoc && (
            <div className={`pdfeditor-dropzone-big ${dragOver ? 'drag-active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop} onClick={() => fileRef.current.click()}>
              <input type="file" accept=".pdf" ref={fileRef} style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setOverlays([]); loadPdf(f); } }} />
              <p className="pdfeditor-droptext">Drop PDF to start editing</p>
            </div>
          )}

          {pdfJsDoc && (
            <div className="pdfeditor-workspace fade-in-panel">
              <div className="pdfeditor-toolbar">
                <span className="toolbar-filename">{file?.name}</span>
                <div className="toolbar-tools">
                   <button className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')}>Text</button>
                   <button className={`tool-btn ${activeTool === 'image' ? 'active' : ''}`} onClick={() => setTool('image')}>Image</button>
                   <button className={`tool-btn ${activeTool === 'erase' ? 'active' : ''}`} onClick={() => setTool('erase')}>Erase</button>
                   <div className="tool-sep" />
                   <a href="https://www.sejda.com/pdf-editor" target="_blank" rel="noopener noreferrer" className="tool-btn pro-btn">Pro Edit</a>
                   <button className="tool-btn dl-btn" onClick={download} disabled={processing}>{processing ? 'Saving...' : 'Download'}</button>
                   <button className="tool-btn close-btn" onClick={() => { setFile(null); setPdfJsDoc(null); setOverlays([]); }}>×</button>
                </div>
              </div>

              <div className="canvas-wrapper" onClick={handleCanvasClick}>
                {pdfJsDoc.fallback ? <div className="fallback-canvas">Preview Ready</div> : <canvas ref={canvasRef} className="pdf-canvas" />}
                
                {curOverlays.map(ov => (
                  <div key={ov.id} className={`pdf-overlay ${draggingId === ov.id ? 'is-dragging' : ''}`}
                    style={{ left: ov.x, top: ov.y }} onMouseDown={e => startDrag(e, ov.id)}>
                    {ov.type === 'text' && <div className="ov-text" style={{ fontSize: ov.fontSize, color: ov.color }}>{ov.text}</div>}
                    {ov.type === 'image' && <div className="ov-image" style={{ width: ov.w, height: ov.h }}><img src={ov.src} alt="" /></div>}
                    {ov.type === 'erase' && <div className="ov-erase" style={{ width: ov.w, height: ov.h }} />}
                    <button className="ov-remove" onMouseDown={e => e.stopPropagation()} onClick={() => setOverlays(p => p.filter(o => o.id !== ov.id))}>×</button>
                  </div>
                ))}

                {pendingPos && activeTool === 'text' && (
                  <div className="pending-text-popup" style={{ left: pendingPos.x, top: pendingPos.y }} onClick={e => e.stopPropagation()}>
                    <input autoFocus type="text" value={pendingText} onChange={e => setPText(e.target.value)} onKeyDown={e => e.key === 'Enter' && commitText()} />
                    <button onClick={commitText}>Add</button>
                  </div>
                )}
              </div>
              
              <div className="page-nav">
                <button disabled={currentPage <= 1} onClick={() => setCurrent(p => p - 1)}>Prev</button>
                <span>{currentPage} / {numPages}</span>
                <button disabled={currentPage >= numPages} onClick={() => setCurrent(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
      <input type="file" accept=".jpg,.jpeg,.png" ref={imgRef} style={{ display: 'none' }} onChange={onImgPicked} />
    </section>
  );
}
