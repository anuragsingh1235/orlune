import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import './Workshop.css';

const CONVERT_FORMATS = [
  { ext: 'docx', label: 'Word (.docx)', icon: 'W', color: '#2b579a' },
  { ext: 'pptx', label: 'PowerPoint (.pptx)', icon: 'P', color: '#d24726' },
  { ext: 'xlsx', label: 'Excel (.xlsx)', icon: 'X', color: '#217346' },
  { ext: 'jpg',  label: 'Image (.jpg)', icon: 'J', color: '#e09b3d' },
  { ext: 'png',  label: 'Image (.png)', icon: 'I', color: '#9b59b6' },
  { ext: 'txt',  label: 'Plain Text (.txt)', icon: 'T', color: '#7f8c8d' },
  { ext: 'html', label: 'Web Page (.html)', icon: 'H', color: '#e44d26' },
  { ext: 'epub', label: 'eBook (.epub)', icon: 'E', color: '#27ae60' },
];

const FROM_FORMATS = [
  { id: 'pdf',  label: 'PDF', accept: '.pdf' },
  { id: 'docx', label: 'Word', accept: '.docx,.doc' },
  { id: 'pptx', label: 'PowerPoint', accept: '.pptx,.ppt' },
  { id: 'xlsx', label: 'Excel', accept: '.xlsx,.xls' },
  { id: 'jpg',  label: 'Image', accept: '.jpg,.jpeg,.png,.webp' },
];

export default function Workshop() {
  const [activeTab, setActiveTab] = useState('convert'); // 'convert' | 'edit'
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fromFormat, setFromFormat] = useState('pdf');
  const [toFormat, setToFormat] = useState('docx');
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState(false);

  // Editor state
  const [editorFile, setEditorFile] = useState(null);
  const [editorDrag, setEditorDrag] = useState(false);
  const [editText, setEditText] = useState('');
  const [editPage, setEditPage] = useState(1);
  const [editX, setEditX] = useState(72);
  const [editY, setEditY] = useState(700);
  const [editFontSize, setEditFontSize] = useState(14);
  const [editColor, setEditColor] = useState('#ffffff');
  const [processing, setProcessing] = useState(false);
  const [editorMsg, setEditorMsg] = useState('');

  const fileRef = useRef();
  const editorRef = useRef();

  // --- CONVERT ---
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setConverted(false); }
  }, []);

  const handleConvert = () => {
    if (!file) return;
    setConverting(true);
    setConverted(false);
    setTimeout(() => {
      setConverting(false);
      setConverted(true);
    }, 1800);
  };

  // Builds the external conversion URL (ilovepdf is the best free online tool)
  const getConvertUrl = () => {
    const base = 'https://www.ilovepdf.com/';
    const from = fromFormat;
    const to = toFormat;
    if (from === 'pdf') {
      const map = { docx: 'pdf_to_word', pptx: 'pdf_to_powerpoint', xlsx: 'pdf_to_excel', jpg: 'pdf_to_jpg', png: 'pdf_to_jpg', txt: 'pdf_to_text', html: 'pdf_to_html', epub: 'pdf_to' };
      return base + (map[to] || 'compress_pdf');
    }
    const fromMap = { docx: 'word_to_pdf', pptx: 'powerpoint_to_pdf', xlsx: 'excel_to_pdf', jpg: 'jpg_to_pdf' };
    return base + (fromMap[from] || 'compress_pdf');
  };

  // --- EDITOR ---
  const onEditorDrop = useCallback((e) => {
    e.preventDefault();
    setEditorDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') { setEditorFile(f); setEditorMsg(''); }
    else setEditorMsg('Please drop a valid PDF file.');
  }, []);

  const handleAddText = async () => {
    if (!editorFile || !editText.trim()) return;
    setProcessing(true);
    setEditorMsg('');
    try {
      const bytes = await editorFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();
      const pageIndex = Math.min(Math.max(editPage - 1, 0), pages.length - 1);
      const page = pages[pageIndex];
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const hex = editColor.replace('#', '');
      const r = parseInt(hex.substring(0,2),16)/255;
      const g = parseInt(hex.substring(2,4),16)/255;
      const b = parseInt(hex.substring(4,6),16)/255;
      page.drawText(editText, {
        x: Number(editX),
        y: Number(editY),
        size: Number(editFontSize),
        font,
        color: rgb(r, g, b),
      });
      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orlune_edited_${editorFile.name}`;
      a.click();
      URL.revokeObjectURL(url);
      setEditorMsg('Text added and PDF downloaded successfully.');
    } catch (err) {
      setEditorMsg('An error occurred. Please try a valid PDF.');
      console.error(err);
    }
    setProcessing(false);
  };

  const availableToFormats = fromFormat === 'pdf' ? CONVERT_FORMATS : [{ ext: 'pdf', label: 'PDF (.pdf)', icon: 'P', color: '#c0392b' }];

  return (
    <section className="workshop-section">
      <div className="workshop-header">
        <div className="workshop-badge">ORLUNE WORKSHOP</div>
        <h2 className="workshop-title">PDF Studio</h2>
        <p className="workshop-sub">Convert any document format. Edit PDFs with precision.</p>
      </div>

      {/* TAB SWITCHER */}
      <div className="workshop-tabs">
        <button
          className={`wtab ${activeTab === 'convert' ? 'active' : ''}`}
          onClick={() => setActiveTab('convert')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          Convert
        </button>
        <button
          className={`wtab ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit PDF
        </button>
      </div>

      {/* CONVERT TAB */}
      {activeTab === 'convert' && (
        <div className="workshop-panel animate-panel">
          {/* Format selectors */}
          <div className="format-row">
            <div className="format-block">
              <label className="format-label">From</label>
              <div className="format-pills">
                {FROM_FORMATS.map(f => (
                  <button
                    key={f.id}
                    className={`format-pill ${fromFormat === f.id ? 'selected' : ''}`}
                    onClick={() => { setFromFormat(f.id); setToFormat(f.id === 'pdf' ? 'docx' : 'pdf'); setFile(null); setConverted(false); }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="format-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>

            <div className="format-block">
              <label className="format-label">To</label>
              <div className="format-pills">
                {availableToFormats.map(f => (
                  <button
                    key={f.ext}
                    className={`format-pill ${toFormat === f.ext ? 'selected' : ''}`}
                    onClick={() => setToFormat(f.ext)}
                    style={toFormat === f.ext ? { background: f.color, borderColor: f.color } : {}}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={`drop-zone ${dragOver ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
          >
            <input
              type="file"
              ref={fileRef}
              style={{ display: 'none' }}
              accept={FROM_FORMATS.find(f => f.id === fromFormat)?.accept || '*'}
              onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setConverted(false); } }}
            />
            {file ? (
              <div className="file-ready">
                <div className="file-icon-large">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button className="file-remove" onClick={(e) => { e.stopPropagation(); setFile(null); setConverted(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <div className="drop-prompt">
                <div className="drop-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <p className="drop-text">Drop your file here</p>
                <p className="drop-hint">or click to browse</p>
              </div>
            )}
          </div>

          {/* Convert Button */}
          {!converted ? (
            <button
              className={`convert-btn ${converting ? 'loading' : ''} ${!file ? 'disabled' : ''}`}
              onClick={handleConvert}
              disabled={!file || converting}
            >
              {converting ? (
                <>
                  <span className="spinner-ring"></span>
                  Processing...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  Convert Now
                </>
              )}
            </button>
          ) : (
            <div className="convert-result">
              <div className="result-info">
                <div className="result-check">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <p className="result-title">File Ready</p>
                  <p className="result-sub">Use the button below to open the converter</p>
                </div>
              </div>
              <a
                href={getConvertUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="result-open-btn"
              >
                Open Converter
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          )}
        </div>
      )}

      {/* EDIT TAB */}
      {activeTab === 'edit' && (
        <div className="workshop-panel animate-panel">
          {/* Drop Zone for Editor */}
          <div
            className={`drop-zone ${editorDrag ? 'drag-active' : ''} ${editorFile ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setEditorDrag(true); }}
            onDragLeave={() => setEditorDrag(false)}
            onDrop={onEditorDrop}
            onClick={() => editorRef.current.click()}
          >
            <input
              type="file"
              ref={editorRef}
              style={{ display: 'none' }}
              accept=".pdf"
              onChange={e => { if (e.target.files[0]) { setEditorFile(e.target.files[0]); setEditorMsg(''); } }}
            />
            {editorFile ? (
              <div className="file-ready">
                <div className="file-icon-large pdf">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                  <p className="file-name">{editorFile.name}</p>
                  <p className="file-size">{(editorFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button className="file-remove" onClick={(e) => { e.stopPropagation(); setEditorFile(null); setEditorMsg(''); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <div className="drop-prompt">
                <div className="drop-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <p className="drop-text">Drop your PDF here</p>
                <p className="drop-hint">or click to browse</p>
              </div>
            )}
          </div>

          {/* Editor Controls */}
          {editorFile && (
            <div className="editor-controls animate-panel">
              <div className="editor-grid">
                <div className="editor-field full">
                  <label>Text to Insert</label>
                  <input
                    type="text"
                    placeholder="Enter your text..."
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="editor-input"
                  />
                </div>
                <div className="editor-field">
                  <label>Page Number</label>
                  <input type="number" min="1" value={editPage} onChange={e => setEditPage(e.target.value)} className="editor-input" />
                </div>
                <div className="editor-field">
                  <label>Font Size</label>
                  <input type="number" min="6" max="120" value={editFontSize} onChange={e => setEditFontSize(e.target.value)} className="editor-input" />
                </div>
                <div className="editor-field">
                  <label>Position X</label>
                  <input type="number" value={editX} onChange={e => setEditX(e.target.value)} className="editor-input" />
                </div>
                <div className="editor-field">
                  <label>Position Y</label>
                  <input type="number" value={editY} onChange={e => setEditY(e.target.value)} className="editor-input" />
                </div>
                <div className="editor-field">
                  <label>Text Color</label>
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="editor-color" />
                </div>
              </div>

              <button
                className={`convert-btn ${processing ? 'loading' : ''}`}
                onClick={handleAddText}
                disabled={processing || !editText.trim()}
              >
                {processing ? (
                  <><span className="spinner-ring"></span>Applying...</>
                ) : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Apply & Download</>
                )}
              </button>

              {editorMsg && (
                <p className={`editor-msg ${editorMsg.includes('error') || editorMsg.includes('valid') ? 'error' : 'success'}`}>
                  {editorMsg}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
