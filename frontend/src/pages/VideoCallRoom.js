import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './VideoCallRoom.css';

const SOCKET_URL   = 'https://orlune.onrender.com';
const ICE_SERVERS  = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

export default function VideoCallRoom({ channel, mode = 'video', onLeave }) {
  /* ── Refs (never stale in callbacks) ── */
  const socketRef       = useRef(null);
  const localStreamRef  = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef        = useRef({}); // socketId → { pc, username, videoEl }

  /* ── State ── */
  const [peers,     setPeers]     = useState([]); // [{ socketId, username, stream }]
  const [micOn,     setMicOn]     = useState(true);
  const [camOn,     setCamOn]     = useState(mode === 'video');
  const [screenOn,  setScreenOn]  = useState(false);
  const [duration,  setDuration]  = useState(0);
  const [connected, setConnected] = useState(false);

  const localVideoRef  = useRef(null);
  const screenVideoRef = useRef(null);

  const rawUser = localStorage.getItem('ww_user');
  const me      = rawUser ? JSON.parse(rawUser) : { id: Date.now(), username: 'You' };
  const roomId  = `channel-${channel?.id || 'global'}`;

  /* ── Create RTCPeerConnection ── */
  const createPeer = useCallback((remoteId, initiator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Push all local tracks into peer connection
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit('ice-candidate', { to: remoteId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      setPeers(prev => prev.map(p =>
        p.socketId === remoteId ? { ...p, stream: streams[0] } : p
      ));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setConnected(true);
    };

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socketRef.current?.emit('offer', { to: remoteId, offer });
      });
    }

    peersRef.current[remoteId] = pc;
    return pc;
  }, []);

  /* ── Main effect: get media, connect socket ── */
  useEffect(() => {
    (async () => {
      try {
        const constraints = mode === 'video'
          ? { video: { width: 1280, height: 720 }, audio: true }
          : { audio: true, video: false };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.warn('Media access denied:', err);
      }

      const socket = io(SOCKET_URL, { transports: ['websocket'], reconnection: true });
      socketRef.current = socket;

      socket.emit('join-room', { roomId, userId: me.id, username: me.username });

      socket.on('user-joined', ({ socketId, username }) => {
        setPeers(prev => [...prev, { socketId, username, stream: null }]);
        createPeer(socketId, true); // we initiate offer
      });

      socket.on('offer', async ({ from, offer, username }) => {
        if (!peersRef.current[from]) {
          setPeers(prev => [...prev, { socketId: from, username: username || 'User', stream: null }]);
        }
        const pc = createPeer(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
      });

      socket.on('answer', ({ from, answer }) => {
        peersRef.current[from]?.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('ice-candidate', ({ from, candidate }) => {
        peersRef.current[from]?.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      });

      socket.on('user-left', ({ socketId }) => {
        peersRef.current[socketId]?.close();
        delete peersRef.current[socketId];
        setPeers(prev => prev.filter(p => p.socketId !== socketId));
      });
    })();

    const timer = setInterval(() => setDuration(d => d + 1), 1000);

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(pc => pc.close());
      socketRef.current?.disconnect();
      clearInterval(timer);
    };
  }, []);

  /* ── Controls ── */
  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(v => !v);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(v => !v);
  };

  const toggleScreen = async () => {
    if (screenOn) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenOn(false);
      // Restore video track in all peers
      const vidTrack = localStreamRef.current?.getVideoTracks()[0];
      if (vidTrack) Object.values(peersRef.current).forEach(pc => {
        pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(vidTrack);
      });
      return;
    }
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = ss;
      setScreenOn(true);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = ss;
      const screenTrack = ss.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(pc => {
        pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(screenTrack);
      });
      screenTrack.onended = () => toggleScreen();
    } catch { /* cancelled */ }
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(peersRef.current).forEach(pc => pc.close());
    socketRef.current?.disconnect();
    onLeave?.();
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const initial = n => (n || 'U')[0].toUpperCase();
  const totalTiles = peers.length + 1;
  const gridCols = totalTiles === 1 ? 1 : totalTiles <= 4 ? 2 : 3;

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  if (mode === 'voice') {
    /* ─── DISCORD-STYLE VOICE ROOM ─── */
    return (
      <div className="vcr-root vcr-voice-mode">
        <div className="vcr-topbar">
          <div className="vcr-title"><span className="vcr-dot" />🎙️ {channel?.name} — Voice</div>
          <div className="vcr-timer">{fmt(duration)}</div>
          <div className="vcr-members">{totalTiles} connected</div>
        </div>

        <div className="vcr-voice-participants">
          {/* Self */}
          <div className={`vcr-voice-participant ${micOn ? '' : 'muted'}`}>
            <div className="vcr-voice-avatar">{initial(me.username)}</div>
            <span className="vcr-voice-name">You</span>
            {!micOn && <span className="vcr-voice-mute-badge">🔇</span>}
          </div>
          {/* Remote */}
          {peers.map(p => (
            <div key={p.socketId} className="vcr-voice-participant connected">
              <div className="vcr-voice-avatar connected">{initial(p.username)}</div>
              <span className="vcr-voice-name">{p.username}</span>
              {p.stream && <audio autoPlay ref={el => { if(el && p.stream) el.srcObject = p.stream; }} />}
            </div>
          ))}
          {peers.length === 0 && (
            <div className="vcr-voice-waiting">
              <p>Nobody else is here yet</p>
              <p className="sub">Share the channel — they'll appear when they join</p>
            </div>
          )}
        </div>

        <div className="vcr-controls vcr-voice-controls">
          <button className={`vcr-btn ${micOn ? '' : 'vcr-btn-off'}`} onClick={toggleMic}>
            <span className="vcr-btn-icon">{micOn ? '🎙️' : '🔇'}</span>
            <span className="vcr-btn-label">{micOn ? 'Mute' : 'Unmute'}</span>
          </button>
          <button className="vcr-btn vcr-btn-end" onClick={endCall}>
            <span className="vcr-btn-icon">📞</span>
            <span className="vcr-btn-label">Disconnect</span>
          </button>
        </div>
      </div>
    );
  }

  /* ─── ZOOM-STYLE VIDEO ROOM ─── */
  return (
    <div className="vcr-root">
      <div className="vcr-topbar">
        <div className="vcr-title"><span className="vcr-dot" />📹 {channel?.name} — Video</div>
        <div className="vcr-timer">{fmt(duration)}</div>
        <div className="vcr-members">{totalTiles} In Call</div>
      </div>

      <div className="vcr-grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        {screenOn && (
          <div className="vcr-tile vcr-screen-tile" style={{ gridColumn: '1 / -1' }}>
            <video ref={screenVideoRef} autoPlay muted playsInline className="vcr-video" />
            <div className="vcr-tile-label">📺 Your Screen</div>
          </div>
        )}

        {/* Self */}
        <div className="vcr-tile vcr-self-tile">
          {camOn
            ? <video ref={localVideoRef} autoPlay muted playsInline className="vcr-video vcr-mirror" />
            : <div className="vcr-avatar">{initial(me.username)}</div>}
          <div className="vcr-tile-label">You {!micOn && '🔇'}</div>
        </div>

        {peers.length === 0 ? (
          <div className="vcr-tile vcr-waiting">
            <div style={{ fontSize: '2.5rem' }}>👥</div>
            <p className="vcr-waiting-text">Nobody else joined yet</p>
            <p className="vcr-waiting-sub">Open the same channel on another device</p>
          </div>
        ) : peers.map(p => (
          <div key={p.socketId} className="vcr-tile">
            {p.stream
              ? <video autoPlay playsInline className="vcr-video" ref={el => { if (el && p.stream) el.srcObject = p.stream; }} />
              : <div className="vcr-avatar">{initial(p.username)}</div>}
            <div className="vcr-tile-label">{p.username}</div>
          </div>
        ))}
      </div>

      <div className="vcr-controls">
        <button className={`vcr-btn ${micOn ? '' : 'vcr-btn-off'}`} onClick={toggleMic} title={micOn ? 'Mute' : 'Unmute'}>
          <span className="vcr-btn-icon">{micOn ? '🎙️' : '🔇'}</span>
          <span className="vcr-btn-label">{micOn ? 'Mic On' : 'Muted'}</span>
        </button>
        <button className={`vcr-btn ${camOn ? '' : 'vcr-btn-off'}`} onClick={toggleCam} title={camOn ? 'Stop Cam' : 'Start Cam'}>
          <span className="vcr-btn-icon">{camOn ? '📹' : '🚫'}</span>
          <span className="vcr-btn-label">{camOn ? 'Camera' : 'Cam Off'}</span>
        </button>
        <button className={`vcr-btn ${screenOn ? 'vcr-btn-active' : ''}`} onClick={toggleScreen} title="Share Screen">
          <span className="vcr-btn-icon">🖥️</span>
          <span className="vcr-btn-label">{screenOn ? 'Stop Share' : 'Share'}</span>
        </button>
        <button className="vcr-btn vcr-btn-end" onClick={endCall} title="End Call">
          <span className="vcr-btn-icon">📵</span>
          <span className="vcr-btn-label">End Call</span>
        </button>
      </div>
    </div>
  );
}
