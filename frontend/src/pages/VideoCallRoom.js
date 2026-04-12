import { useState, useEffect, useRef } from 'react';
import './VideoCallRoom.css';

// ── Real WebRTC peers will be added here via Socket.io signaling
// ── Requires a persistent backend server (not Vercel serverless)

export default function VideoCallRoom({ channel, onLeave }) {
  const localVideoRef  = useRef(null);
  const screenVideoRef = useRef(null);

  const [localStream,  setLocalStream]  = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [peers,        setPeers]        = useState([]); // empty — filled by real WebRTC signaling

  const [micOn,    setMicOn]    = useState(true);
  const [camOn,    setCamOn]    = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [duration, setDuration] = useState(0);
  const [speaking,  setSpeaking] = useState(null); // id of speaking peer

  /* ── Start local media ── */
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        setCamOn(false);
      }
    })();
    return () => { localStream?.getTracks().forEach(t => t.stop()); };
  }, []);

  /* ── Call timer ── */
  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Mock speaking indicator ── */
  useEffect(() => {
    const ids = ['me', ...peers.map(p => p.id)];
    const t = setInterval(() => {
      setSpeaking(ids[Math.floor(Math.random() * ids.length)]);
      setTimeout(() => setSpeaking(null), 1200);
    }, 3000);
    return () => clearInterval(t);
  }, [peers]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  /* ── Toggle Mic ── */
  const toggleMic = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(v => !v);
  };

  /* ── Toggle Camera ── */
  const toggleCam = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(v => !v);
  };

  /* ── Screen Share ── */
  const toggleScreen = async () => {
    if (screenOn) {
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setScreenOn(false);
      return;
    }
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setScreenStream(ss);
      setScreenOn(true);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = ss;
      ss.getVideoTracks()[0].onended = () => { setScreenStream(null); setScreenOn(false); };
    } catch { /* user cancelled */ }
  };

  /* ── End Call ── */
  const endCall = () => {
    localStream?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    onLeave?.();
  };

  const totalTiles = peers.length + 1; // +1 for self
  const gridCols = totalTiles <= 1 ? 1 : totalTiles <= 4 ? 2 : 3;

  return (
    <div className="vcr-root">
      {/* ─── TOP BAR ─── */}
      <div className="vcr-topbar">
        <div className="vcr-title">
          <span className="vcr-dot" />
          {channel?.name || 'Voice Room'}
        </div>
        <div className="vcr-timer">{fmt(duration)}</div>
        <div className="vcr-members">{totalTiles} In Call</div>
      </div>

      {/* ─── MAIN GRID ─── */}
      <div className="vcr-grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>

        {/* Screen share takes full row when active */}
        {screenOn && (
          <div className="vcr-tile vcr-screen-tile" style={{ gridColumn: `1 / -1` }}>
            <video ref={screenVideoRef} autoPlay muted playsInline className="vcr-video" />
            <div className="vcr-tile-label">📺 Your Screen</div>
          </div>
        )}

        {/* Self tile */}
        <div className={`vcr-tile ${speaking === 'me' ? 'vcr-speaking' : ''}`}>
          {camOn
            ? <video ref={localVideoRef} autoPlay muted playsInline className="vcr-video vcr-mirror" />
            : <div className="vcr-avatar">A</div>
          }
          <div className="vcr-tile-label">
            You {!micOn && <span className="vcr-muted-icon">🔇</span>}
          </div>
          {speaking === 'me' && <div className="vcr-speaking-ring" />}
        </div>

        {/* Remote peer tiles — populated by WebRTC signaling */}
        {peers.length === 0 ? (
          <div className="vcr-tile vcr-waiting">
            <div className="vcr-waiting-icon">⏳</div>
            <p className="vcr-waiting-text">Waiting for others to join...</p>
            <p className="vcr-waiting-sub">Share the channel link to invite people</p>
          </div>
        ) : peers.map(p => (
          <div key={p.id} className={`vcr-tile ${speaking === p.id ? 'vcr-speaking' : ''}`}>
            {p.stream
              ? <video autoPlay playsInline className="vcr-video" ref={el => { if(el) el.srcObject = p.stream; }} />
              : <div className="vcr-avatar">{p.name[0]}</div>
            }
            <div className="vcr-tile-label">
              {p.name} {p.muted && <span className="vcr-muted-icon">🔇</span>}
            </div>
            {speaking === p.id && <div className="vcr-speaking-ring" />}
          </div>
        ))}
      </div>

      {/* ─── BOTTOM CONTROLS ─── */}
      <div className="vcr-controls">

        <button className={`vcr-btn ${micOn ? '' : 'vcr-btn-off'}`} onClick={toggleMic} title={micOn ? 'Mute' : 'Unmute'}>
          <span className="vcr-btn-icon">{micOn ? '🎙️' : '🔇'}</span>
          <span className="vcr-btn-label">{micOn ? 'Mute' : 'Unmute'}</span>
        </button>

        <button className={`vcr-btn ${camOn ? '' : 'vcr-btn-off'}`} onClick={toggleCam} title={camOn ? 'Stop Camera' : 'Start Camera'}>
          <span className="vcr-btn-icon">{camOn ? '📹' : '📷'}</span>
          <span className="vcr-btn-label">{camOn ? 'Camera' : 'Start Cam'}</span>
        </button>

        <button className={`vcr-btn ${screenOn ? 'vcr-btn-active' : ''}`} onClick={toggleScreen} title="Share Screen">
          <span className="vcr-btn-icon">🖥️</span>
          <span className="vcr-btn-label">{screenOn ? 'Stop Share' : 'Share Screen'}</span>
        </button>

        <button className="vcr-btn vcr-btn-end" onClick={endCall} title="End Call">
          <span className="vcr-btn-icon">📵</span>
          <span className="vcr-btn-label">End</span>
        </button>
      </div>
    </div>
  );
}
