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
  const [peers,     setPeers]     = useState([]); // [{ socketId, username, stream, camOn, micOn, screenOn }]
  const [micOn,     setMicOn]     = useState(true);
  const [camOn,     setCamOn]     = useState(mode === 'video');
  const [screenOn,  setScreenOn]  = useState(false);
  const [sharingId, setSharingId] = useState(null); // Which socketId is sharing
  const [duration,  setDuration]  = useState(0);

  const localVideoRef  = useRef(null);
  const screenVideoRef = useRef(null);

  const rawUser = localStorage.getItem('ww_user');
  const me      = rawUser ? JSON.parse(rawUser) : { id: 1337, username: 'User' };
  const roomId  = `channel-${channel?.id || 'room'}`;

  /* ── Status Syncing ── */
  const broadcastStatus = (status) => {
    socketRef.current?.emit('media-status', { roomId, ...status });
  };

  /* ── Create RTCPeerConnection ── */
  const createPeer = useCallback((remoteId, initiator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Push local tracks
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit('ice-candidate', { to: remoteId, candidate });
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers(prev => prev.map(p =>
        p.socketId === remoteId ? { ...p, stream: remoteStream } : p
      ));
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

  /* ── Main Effect ── */
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: mode === 'video' ? { width: 1280, height: 720 } : false,
          audio: true
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) { console.error("Media Error:", err); }

      const socket = io(SOCKET_URL, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.emit('join-room', { roomId, userId: me.id, username: me.username });

      socket.on('user-joined', ({ socketId, username }) => {
        setPeers(prev => [...prev, { socketId, username, stream: null, camOn: true, micOn: true, screenOn: false }]);
        createPeer(socketId, true);
        // Inform them of our current state
        broadcastStatus({ camOn, micOn, screenOn });
      });

      socket.on('offer', async ({ from, offer, username }) => {
        if (!peersRef.current[from]) {
          setPeers(prev => [...prev, { socketId: from, username: username || 'Peer', stream: null }]);
        }
        const pc = createPeer(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        socket.emit('answer', { to: from, answer: await pc.createAnswer() });
        await pc.setLocalDescription(pc.localDescription);
        broadcastStatus({ camOn, micOn, screenOn });
      });

      socket.on('answer', ({ from, answer }) => {
        peersRef.current[from]?.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('ice-candidate', ({ from, candidate }) => {
        peersRef.current[from]?.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
      });

      socket.on('media-status', ({ from, camOn, micOn, screenOn }) => {
        setPeers(prev => prev.map(p => 
          p.socketId === from ? { ...p, camOn, micOn, screenOn } : p
        ));
        if (screenOn) setSharingId(from);
        else if (sharingId === from) setSharingId(null);
      });

      socket.on('user-left', ({ socketId }) => {
        peersRef.current[socketId]?.close();
        delete peersRef.current[socketId];
        setPeers(prev => prev.filter(p => p.socketId !== socketId));
        if (sharingId === socketId) setSharingId(null);
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
    const isEnabled = !micOn;
    localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = isEnabled);
    setMicOn(isEnabled);
    broadcastStatus({ micOn: isEnabled, camOn, screenOn });
  };

  const toggleCam = () => {
    const isEnabled = !camOn;
    localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = isEnabled);
    setCamOn(isEnabled);
    broadcastStatus({ camOn: isEnabled, micOn, screenOn });
  };

  const toggleScreen = async () => {
    if (screenOn) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenOn(false);
      setSharingId(null);
      const vidTrack = localStreamRef.current?.getVideoTracks()[0];
      if (vidTrack) Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(vidTrack);
      });
      broadcastStatus({ screenOn: false, camOn, micOn });
      return;
    }
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = ss;
      setScreenOn(true);
      setSharingId(me.id);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = ss;
      const screenTrack = ss.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });
      broadcastStatus({ screenOn: true, camOn, micOn });
      screenTrack.onended = () => toggleScreen();
    } catch (e) {}
  };

  const endCall = () => { onLeave?.(); };

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  /* ── Dynamic Layout ── */
  const activePresenter = sharingId === me.id ? 'me' : peers.find(p => p.screenOn);
  const isPresenting = !!activePresenter;

  if (mode === 'voice') {
    return (
      <div className="vcr-root vcr-voice-mode">
        <div className="vcr-topbar">
          <div className="vcr-title"><span className="vcr-dot" />🎙️ {channel?.name} — Voice</div>
          <div className="vcr-timer">{fmt(duration)}</div>
          <div className="vcr-members">{peers.length + 1} connected</div>
        </div>
        <div className="vcr-voice-participants">
          <div className={`vcr-voice-participant ${micOn ? 'speaking' : 'muted'}`}>
            <div className={`vcr-voice-avatar ${micOn ? 'connected' : ''}`}>{(me.username || 'U')[0]}</div>
            <span className="vcr-voice-name">You</span>
            {!micOn && <span className="vcr-voice-mute-badge">🔇</span>}
          </div>
          {peers.map(p => (
            <div key={p.socketId} className={`vcr-voice-participant ${p.micOn ? 'speaking' : 'muted'}`}>
              <div className={`vcr-voice-avatar ${p.micOn ? 'connected' : ''}`}>{(p.username || 'U')[0]}</div>
              <span className="vcr-voice-name">{p.username}</span>
              {!p.micOn && <span className="vcr-voice-mute-badge">🔇</span>}
              <audio autoPlay ref={el => { if (el && p.stream) el.srcObject = p.stream; }} />
            </div>
          ))}
        </div>
        <div className="vcr-controls">
          <button className={`vcr-btn ${micOn ? '' : 'vcr-btn-off'}`} onClick={toggleMic}>
            <span className="vcr-btn-icon">{micOn ? '🎙️' : '🔇'}</span>
            <span className="vcr-btn-label">{micOn ? 'Mute' : 'Unmute'}</span>
          </button>
          <button className="vcr-btn vcr-btn-end" onClick={endCall}>📴 Leave</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`vcr-root ${isPresenting ? 'vcr-presentation' : ''}`}>
      <div className="vcr-topbar">
        <div className="vcr-title"><span className="vcr-dot" />📹 {channel?.name}</div>
        <div className="vcr-timer">{fmt(duration)}</div>
        <div className="vcr-members">{peers.length + 1} Active</div>
      </div>

      <div className="vcr-main-content">
        {isPresenting && (
          <div className="vcr-featured">
            {activePresenter === 'me' ? (
              <video ref={screenVideoRef} autoPlay playsInline muted className="vcr-video" />
            ) : (
              <video autoPlay playsInline className="vcr-video" ref={el => { if (el && activePresenter.stream) el.srcObject = activePresenter.stream; }} />
            )}
            <div className="vcr-tile-label featured-label">📺 {activePresenter === 'me' ? 'Your Screen' : `${activePresenter.username}'s Screen`}</div>
          </div>
        )}

        <div className={`vcr-grid ${isPresenting ? 'vcr-sidebar-grid' : ''}`}>
          {/* Self */}
          <div className={`vcr-tile ${isPresenting ? 'vcr-tile-sm' : ''}`}>
            {camOn 
              ? <video ref={localVideoRef} autoPlay playsInline muted className="vcr-video vcr-mirror" />
              : <div className="vcr-avatar">{(me.username || 'U')[0]}</div>}
            <div className="vcr-tile-label">You {!micOn && '🔇'}</div>
          </div>

          {/* Peers */}
          {peers.map(p => (
            <div key={p.socketId} className={`vcr-tile ${isPresenting ? 'vcr-tile-sm' : ''} ${p.screenOn ? 'hide-in-grid' : ''}`}>
               {p.camOn && p.stream 
                  ? <video autoPlay playsInline className="vcr-video" ref={el => { if (el && p.stream) el.srcObject = p.stream; }} />
                  : <div className="vcr-avatar">{(p.username || 'U')[0]}</div>}
               <div className="vcr-tile-label">{p.username} {!p.micOn && '🔇'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="vcr-controls">
        <button className={`vcr-btn ${micOn ? '' : 'vcr-btn-off'}`} onClick={toggleMic}>
          <span className="vcr-btn-icon">{micOn ? '🎙️' : '🔇'}</span>
          <span className="vcr-btn-label">Mic</span>
        </button>
        <button className={`vcr-btn ${camOn ? '' : 'vcr-btn-off'}`} onClick={toggleCam}>
          <span className="vcr-btn-icon">{camOn ? '📹' : '🚫'}</span>
          <span className="vcr-btn-label">Cam</span>
        </button>
        <button className={`vcr-btn ${screenOn ? 'vcr-btn-active' : ''}`} onClick={toggleScreen}>
          <span className="vcr-btn-icon">🖥️</span>
          <span className="vcr-btn-label">Share</span>
        </button>
        <button className="vcr-btn vcr-btn-end" onClick={endCall}>📵 End</button>
      </div>
    </div>
  );
}
