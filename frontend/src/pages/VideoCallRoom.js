import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './VideoCallRoom.css';

const SOCKET_URL = 'https://orlune.onrender.com';
const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function VideoCallRoom({ channel, onLeave }) {
  const localVideoRef  = useRef(null);
  const screenVideoRef = useRef(null);
  const socketRef      = useRef(null);
  const peersRef       = useRef({}); // { socketId: RTCPeerConnection }

  const [localStream,  setLocalStream]  = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [peers,        setPeers]        = useState([]); // [{ socketId, username, stream }]

  const [micOn,    setMicOn]    = useState(true);
  const [camOn,    setCamOn]    = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [duration, setDuration] = useState(0);

  const rawUser  = localStorage.getItem('ww_user');
  const me       = rawUser ? JSON.parse(rawUser) : { id: 'anon', username: 'You' };
  const roomId   = `channel-${channel?.id || 'global'}`;

  /* ── Create peer connection for a remote socket ── */
  const createPeer = useCallback((remoteSocketId, stream, initiator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    stream?.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit('ice-candidate', { to: remoteSocketId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      setPeers(prev => {
        const updated = prev.map(p => p.socketId === remoteSocketId ? { ...p, stream: streams[0] } : p);
        return updated;
      });
    };

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socketRef.current?.emit('offer', { to: remoteSocketId, offer });
      });
    }

    peersRef.current[remoteSocketId] = pc;
    return pc;
  }, []);

  /* ── Start local media + connect socket ── */
  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch { setCamOn(false); }

      const socket = io(SOCKET_URL, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.emit('join-room', { roomId, userId: me.id, username: me.username });

      socket.on('user-joined', ({ socketId, username }) => {
        setPeers(prev => [...prev, { socketId, username, stream: null }]);
        createPeer(socketId, stream, true);
      });

      socket.on('offer', async ({ from, offer }) => {
        const pc = createPeer(from, stream, false);
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
      });

      socket.on('answer', ({ from, answer }) => {
        peersRef.current[from]?.setRemoteDescription(answer);
      });

      socket.on('ice-candidate', ({ from, candidate }) => {
        peersRef.current[from]?.addIceCandidate(candidate).catch(() => {});
      });

      socket.on('user-left', ({ socketId }) => {
        peersRef.current[socketId]?.close();
        delete peersRef.current[socketId];
        setPeers(prev => prev.filter(p => p.socketId !== socketId));
      });
    })();

    const timer = setInterval(() => setDuration(d => d + 1), 1000);

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(pc => pc.close());
      socketRef.current?.disconnect();
      clearInterval(timer);
    };
  }, [roomId]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(v => !v);
  };

  const toggleCam = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(v => !v);
  };

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

      // Replace video track in all peer connections
      const screenTrack = ss.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        sender?.replaceTrack(screenTrack);
      });
    } catch { /* user cancelled */ }
  };

  const endCall = () => {
    localStream?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    Object.values(peersRef.current).forEach(pc => pc.close());
    socketRef.current?.disconnect();
    onLeave?.();
  };

  const totalTiles = peers.length + 1;
  const gridCols   = totalTiles <= 1 ? 1 : totalTiles <= 4 ? 2 : 3;

  return (
    <div className="vcr-root">
      <div className="vcr-topbar">
        <div className="vcr-title"><span className="vcr-dot" />{channel?.name || 'Voice Room'}</div>
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

        {/* Self tile */}
        <div className="vcr-tile">
          {camOn
            ? <video ref={localVideoRef} autoPlay muted playsInline className="vcr-video vcr-mirror" />
            : <div className="vcr-avatar">{me.username?.[0]?.toUpperCase() || 'Y'}</div>
          }
          <div className="vcr-tile-label">You {!micOn && <span className="vcr-muted-icon">🔇</span>}</div>
        </div>

        {/* Remote peers */}
        {peers.length === 0 ? (
          <div className="vcr-tile vcr-waiting">
            <div className="vcr-waiting-icon">⏳</div>
            <p className="vcr-waiting-text">Waiting for others to join...</p>
            <p className="vcr-waiting-sub">Share the channel with friends</p>
          </div>
        ) : peers.map(p => (
          <div key={p.socketId} className="vcr-tile">
            {p.stream
              ? <video autoPlay playsInline className="vcr-video" ref={el => { if(el && p.stream) el.srcObject = p.stream; }} />
              : <div className="vcr-avatar">{p.username?.[0]?.toUpperCase() || '?'}</div>
            }
            <div className="vcr-tile-label">{p.username}</div>
          </div>
        ))}
      </div>

      <div className="vcr-controls">
        <button className={`vcr-btn ${micOn ? '' : 'vcr-btn-off'}`} onClick={toggleMic}>
          <span className="vcr-btn-icon">{micOn ? '🎙️' : '🔇'}</span>
          <span className="vcr-btn-label">{micOn ? 'Mute' : 'Unmute'}</span>
        </button>
        <button className={`vcr-btn ${camOn ? '' : 'vcr-btn-off'}`} onClick={toggleCam}>
          <span className="vcr-btn-icon">{camOn ? '📹' : '📷'}</span>
          <span className="vcr-btn-label">{camOn ? 'Camera' : 'Start Cam'}</span>
        </button>
        <button className={`vcr-btn ${screenOn ? 'vcr-btn-active' : ''}`} onClick={toggleScreen}>
          <span className="vcr-btn-icon">🖥️</span>
          <span className="vcr-btn-label">{screenOn ? 'Stop Share' : 'Share Screen'}</span>
        </button>
        <button className="vcr-btn vcr-btn-end" onClick={endCall}>
          <span className="vcr-btn-icon">📵</span>
          <span className="vcr-btn-label">End</span>
        </button>
      </div>
    </div>
  );
}
