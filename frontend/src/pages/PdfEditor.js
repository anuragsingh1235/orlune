import React, { useState, useRef, useCallback, useEffect } from 'react';
import './PdfEditor.css';

export default function PdfEditor() {
  const [tab, setTab] = useState('edit');

  // Core State
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
  const [pageSize, setPageSize] = useState({ w: 1, h: 1 });

  // Drag & Scanning
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [omrScanning, setOmrScanning] = useState(false);

  const canvasRef = useRef();
  const fileRef = useRef();
  const imgRef = useRef();

  // 1. PDF Loading
  const loadPdf = useCallback(async (f) => {
    setStatus('Opening Studio...');
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '5.6.205'}/build/pdf.worker.min.mjs`;

      const ab = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      setPdfJsDoc(doc);
      setNumPages(doc.numPages);
      renderPage(doc, 1);
      setStatus('Document loaded. Use "Full Scan" to make everything editable.');
    } catch (err) {
      console.error(err);
      setPdfJsDoc({ fallback: true });
      setStatus('Preview unavailable. Manual editing active.');
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
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (pdfJsDoc && !pdfJsDoc.fallback) renderPage(pdfJsDoc, currentPage);
  }, [currentPage, pdfJsDoc, renderPage]);

  // 2. Intelligent OMR / OCR Scanning
  const runOmrScan = async () => {
    if (!pdfJsDoc || pdfJsDoc.fallback) {
      setStatus('error:Cannot scan this file type. Try a standard PDF.');
      return;
    }
    setOmrScanning(true);
    setStatus('Detecting elements...');

    try {
      const page = await pdfJsDoc.getPage(currentPage);
      const view = page.getViewport({ scale: 1.5 });
      const content = await page.getTextContent();
      
      const newOverlays = [];
      content.items.forEach((item, idx) => {
        // Map PDF coords to local canvas coords
        const [x, y] = [item.transform[4], item.transform[5]];
        const tx = x * (view.width / view.viewBox[2]);
        const ty = (view.viewBox[3] - y) * (view.height / view.viewBox[3]) - (item.height * 1.5);
        
        if (item.str.trim().length > 0) {
          newOverlays.push({
            id: `scan-${Date.now()}-${idx}`,
            type: 'text',
            page: currentPage,
            x: tx,
            y: ty,
            text: item.str,
            fontSize: item.height * 1.5 || 14,
            color: '#000000',
            isDetected: true // Mark as detected to allow "Full Erasure" behind it
          });
        }
      });

      // Add detected overlays
      setOverlays(prev => [...prev, ...newOverlays]);
      setTab('edit');
      setStatus(`success:Scan complete! Detected ${newOverlays.length} editable elements on this page.`);
    } catch (e) {
      console.error(e);
      setStatus('error:Deep scan failed. Try manual modification.');
    }
    setOmrScanning(false);
  };

  // 3. Dragging Logic
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

  // 4. Canvas Tools
  const handleCanvasClick = (e) => {
    if (!pdfJsDoc || draggingId !== null) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'text') { setPending({ x, y }); setPText(''); }
    else if (activeTool === 'image') { setPending({ x, y }); imgRef.current.click(); }
    else if (activeTool === 'erase') {
      setOverlays(p => [...p, { id: Date.now(), type: 'erase', page: currentPage, x, y, w: 120, h: 24 }]);
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
    setOverlays(p => [...p, { id: Date.now(), type: 'image', page: currentPage, x: pendingPos.x, y: pendingPos.y, w: 150, h: 100, src: URL.createObjectURL(f), file: f }]);
    setPending(null);
  };

  // 5. Download & Apply Changes
  const download = async () => {
    if (!file) return;
    setProc(true); setStatus('Saving Studio changes...');
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
        const page = pages[Math.min(ov.page - 1, pages.length - 1)];
        const { height: pph } = page.getSize();
        const [cx, cy] = [ov.x * sx, pph - (ov.y * sy)];

        if (ov.type === 'erase') {
          page.drawRectangle({ x: cx, y: cy - (ov.h * sy), width: ov.w * sx, height: ov.h * sy, color: rgb(1,1,1) });
        } else if (ov.type === 'text') {
          const sz = (ov.fontSize || 14) * Math.min(sx, sy);
          const hex = (ov.color || '#000000').replace('#', '');
          const r = parseInt(hex.slice(0,2),16)/255, g = parseInt(hex.slice(2,4),16)/255, b = parseInt(hex.slice(4,6),16)/255;
          // IMPORTANT: If detected, we erase original behind it
          page.drawRectangle({ x: cx - 2, y: cy - sz - 4, width: ov.text.length * sz * 0.6 + 6, height: sz + 10, color: rgb(1,1,1) });
          page.drawText(ov.text, { x: cx, y: cy - sz, size: sz, font, color: rgb(r, g, b) });
        } else if (ov.type === 'image') {
          const ib = await ov.file.arrayBuffer();
          const img = ov.file.type === 'image/png' ? await doc.embedPng(ib) : await doc.embedJpg(ib);
          page.drawImage(img, { x: cx, y: cy - (ov.h * sy), width: ov.w * sx, height: ov.h * sy });
        }
      }

      const out = await doc.save();
      const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `Studio_Edit_${file.name}`; a.click();
      setStatus('success:Changes applied. File downloaded.');
    } catch (e) {
      console.error(e);
      setStatus('error:Failed to apply changes. Document might be restricted.');
    }
    setProc(false);
  };

  const curOverlays = overlays.filter(o => o.page === currentPage);
  const statusType  = status.includes('success:') ? 'success' : status.includes('error:') ? 'error' : 'info';
  const statusMsg   = status.replace(/^(success:|error:)/, '');

  return (
    <section className="pdfeditor-section">
      <div className="pdfeditor-header">
        <div className="pdfeditor-badge">FULL EDIT MODE</div>
        <h2 className="pdfeditor-title">Studio Hub</h2>
        <p className="pdfeditor-sub">Scan any document to make every word and image editable.</p>
      </div>

      <div className="pdf-tabs">
        {['edit', 'scan'].map(t => (
          <button key={t} className={`pdf-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'edit' ? 'Editor' : 'Deep Scan Studio'}
          </button>
        ))}
      </div>

      {tab === 'scan' && (
        <div className="omr-container fade-in-panel">
          {!file ? <div className="omr-empty">Please upload a file in common Editor tab first.</div> : (
             <div className="omr-scanner-ui">
                <div className={`scan-visual ${omrScanning ? 'scanning' : ''}`}>
                   <div className="scan-line" />
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                </div>
                <p className="omr-title">Intelligent Deep Scan</p>
                <p className="omr-desc">Orlune will detect all text layers and convert them into editable blocks.</p>
                <button className={`omr-btn ${omrScanning ? 'loading' : ''}`} onClick={runOmrScan} disabled={omrScanning}>
                  {omrScanning ? 'Analyzing Document...' : 'Start Deep Scan'}
                </button>
             </div>
          )}
        </div>
      )}

      {tab === 'edit' && (
        <>
          {!pdfJsDoc && (
             <div className="pdfeditor-dropzone-big" onClick={() => fileRef.current.click()}>
               <input type="file" accept=".pdf" ref={fileRef} style={{ display: 'none' }} onChange={e => { const f=e.target.files[0]; if(f){ setFile(f); setOverlays([]); loadPdf(f); } }} />
               <p className="pdfeditor-droptext">Drop PDF here to begin Full Edit</p>
             </div>
          )}

          {pdfJsDoc && (
             <div className="pdfeditor-workspace fade-in-panel">
               <div className="pdfeditor-toolbar">
                 <span className="toolbar-filename">{file?.name}</span>
                 <div className="toolbar-tools">
                    <button className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')}>Text</button>
                    <button className={`tool-btn ${activeTool === 'image' ? 'active' : ''}`} onClick={() => setTool('image')}>Img</button>
                    <button className={`tool-btn ${activeTool === 'erase' ? 'active' : ''}`} onClick={() => setTool('erase')}>Eraser</button>
                    <div className="tool-sep" />
                    <button className="tool-btn dl-btn" onClick={download} disabled={processing}>{processing ? 'Processing...' : 'Save & Download'}</button>
                    <button className="tool-btn close-btn" onClick={() => { setFile(null); setPdfJsDoc(null); setOverlays([]); }}>×</button>
                 </div>
               </div>

               {statusMsg && <div className={`pdfeditor-msg ${statusType}`}>{statusMsg}</div>}

               <div className="canvas-wrapper" onClick={handleCanvasClick}>
                  {pdfJsDoc.fallback ? <div className="fallback-canvas">Manual Edit Ready</div> : <canvas ref={canvasRef} className="pdf-canvas" />}
                  
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
                    </div>
                  )}
               </div>

               <div className="page-nav">
                  <button disabled={currentPage <= 1} onClick={() => setCurrent(p => p - 1)}>←</button>
                  <span className="page-info">{currentPage} / {numPages}</span>
                  <button disabled={currentPage >= numPages} onClick={() => setCurrent(p => p + 1)}>→</button>
               </div>
             </div>
          )}
        </>
      )}
      <input type="file" accept="image/*" ref={imgRef} style={{ display: 'none' }} onChange={onImgPicked} />
    </section>
  );
}
