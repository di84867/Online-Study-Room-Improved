import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
    Settings, Share2, Monitor,
    Edit3, Paperclip, Send, Download, Loader2,
    WifiOff, ShieldCheck, FileText, XCircle,
    Sparkles, Trash2, UserMinus, Check, X, Search, Users, Copy
} from 'lucide-react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import Whiteboard from '../components/Room/Whiteboard';
import './Room.css';

const Room = ({ user }) => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    // --- App States ---
    const [hardwareReady, setHardwareReady] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isRoomAdmin, setIsRoomAdmin] = useState(false);
    const [isWaiting, setIsWaiting] = useState(true); // Default to waiting

    // --- UI States ---
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [chatType, setChatType] = useState('public');
    const [privateTarget, setPrivateTarget] = useState(null);
    
    // Toggle for Whiteboard Mode (replaces simple showBoard)
    const [whiteboardActive, setWhiteboardActive] = useState(false);
    
    const [messages, setMessages] = useState([]);
    const [privateMessages, setPrivateMessages] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [remoteStreams, setRemoteStreams] = useState({});
    const [error, setError] = useState(null);

    const [activeFilter, setActiveFilter] = useState('none');
    const [showEffects, setShowEffects] = useState(false);

    // Speaker States
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakers, setSpeakers] = useState({});
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    
    // Network Quality States
    const [poorConnection, setPoorConnection] = useState(false);
    const [videoPausedDueToNetwork, setVideoPausedDueToNetwork] = useState(false);

    // Refs
    const socketRef = useRef();
    const localStreamRef = useRef();
    const connectionsRef = useRef({});
    const localVideoRef = useRef();
    const localCanvasRef = useRef(null);
    const chatEndRef = useRef();
    const myNameRef = useRef(user?.displayName || `Guest_${Math.floor(Math.random() * 1000)}`);
    const isSpeakingRef = useRef(false);
    const segmentationRef = useRef(null);
    const screenTrackRef = useRef();
    const isAdminRef = useRef(false);

    useEffect(() => { isAdminRef.current = isRoomAdmin; }, [isRoomAdmin]);

    // Host Check Effect
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get('host') === 'true') {
            setIsRoomAdmin(true);
            setIsWaiting(false); // Admin never waits
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] };

    // --- MediaPipe Blur Logic (Simplified for brevity) ---
    // (Existing Blur Logic maintained) 
    useEffect(() => {
        if (!window.SelfieSegmentation) return;
        const seg = new window.SelfieSegmentation({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}` });
        seg.setOptions({ modelSelection: 1 });
        seg.onResults((res) => {
            const canvas = localCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(res.segmentationMask, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-out';
            ctx.filter = 'blur(12px)';
            ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'destination-atop';
            ctx.filter = 'none';
            ctx.drawImage(res.image, 0, 0, canvas.width, canvas.height);
        });
        segmentationRef.current = seg;
    }, []);

    const processFrame = useCallback(async () => {
        if (activeFilter === 'blur' && segmentationRef.current && localVideoRef.current && localVideoRef.current.readyState >= 2) {
            try { await segmentationRef.current.send({ image: localVideoRef.current }); } catch (e) {}
        }
        if (activeFilter === 'blur') requestAnimationFrame(processFrame);
    }, [activeFilter]);

    useEffect(() => { if (activeFilter === 'blur') requestAnimationFrame(processFrame); }, [activeFilter, processFrame]);

    // Scroll chat
    useEffect(() => { if (showChat) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, showChat]);


    // --- PIP Stream Re-attach ---
    useEffect(() => {
        if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
    }, [whiteboardActive, hardwareReady]);

    // --- Socket Initialization ---
    useEffect(() => {
        let mounted = true;
        let audioCtx, analyser, dataArray, rafId;

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 360 },
                    audio: { echoCancellation: true, noiseSuppression: true }
                });

                if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                setHardwareReady(true);

                // Voice Detection
                try {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioCtx.createMediaStreamSource(stream);
                    analyser = audioCtx.createAnalyser();
                    source.connect(analyser);
                    dataArray = new Uint8Array(analyser.frequencyBinCount);
                    const checkSpeaking = () => {
                        if (!mounted) return;
                        analyser.getByteFrequencyData(dataArray);
                        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                        if ((avg > 40) !== isSpeakingRef.current) {
                            isSpeakingRef.current = (avg > 40);
                            setIsSpeaking(avg > 40);
                            socketRef.current?.emit('speaking', avg > 40);
                        }
                        rafId = requestAnimationFrame(checkSpeaking);
                    };
                    checkSpeaking();
                } catch (e) {}

                socketRef.current = io();

                socketRef.current.on('connect', () => {
                    setIsConnected(true);
                    const query = new URLSearchParams(window.location.search);
                    const isHost = isAdminRef.current || query.get('host') === 'true';
                    socketRef.current.emit('join room', roomId, myNameRef.current, isHost, user?.photoURL);
                });

                socketRef.current.on('join room', (otherUsers, names, mics, videos, isAdmin, isActive, photos) => {
                    if (mounted) {
                        const amAdmin = isAdmin || isAdminRef.current;
                        setIsRoomAdmin(amAdmin);
                        isAdminRef.current = amAdmin;

                        if (amAdmin || isActive) {
                            setIsWaiting(false);
                            setIsJoined(true);
                        } else {
                            setIsWaiting(true);
                        }

                        if (otherUsers) {
                            otherUsers.forEach(id => {
                                setRemoteStreams(prev => ({ 
                                    ...prev, 
                                    [id]: { 
                                        name: names[id], 
                                        id, 
                                        photoURL: photos ? photos[id] : null 
                                    } 
                                }));
                                const pc = createPeerConnection(id);
                                connectionsRef.current[id] = pc;
                                stream.getTracks().forEach(track => pc.addTrack(track, stream));
                            });
                        }
                    }
                });

                socketRef.current.on('room-started', () => {
                    if(mounted) {
                        setIsWaiting(false);
                        setIsJoined(true);
                    }
                });

                socketRef.current.on('message', (msg, sender, time, href, senderId, isAdmin) => {
                    if (mounted) {
                        setMessages(prev => [...prev, { text: msg, sender, time, href, senderId, isAdmin }]);
                    }
                });

                socketRef.current.on('private message', (msg, sender, time, senderId, targetId, isLog, href) => {
                    if (mounted) {
                        const otherId = senderId === socketRef.current.id ? targetId : senderId;
                        setPrivateMessages(prev => ({
                            ...prev,
                            [otherId]: [...(prev[otherId] || []), { text: msg, sender, time, senderId, isLog, href }]
                        }));
                    }
                });

                socketRef.current.on('video-offer', async (offer, sid, name) => {
                   const pc = createPeerConnection(sid);
                   connectionsRef.current[sid] = pc;
                   setRemoteStreams(prev => ({ ...prev, [sid]: { ...prev[sid], name, id: sid } }));
                   await pc.setRemoteDescription(new RTCSessionDescription(offer));
                   stream.getTracks().forEach(track => pc.addTrack(track, stream));
                   const answer = await pc.createAnswer();
                   await pc.setLocalDescription(answer);
                   socketRef.current.emit('video-answer', pc.localDescription, sid);
                });
                
                socketRef.current.on('video-answer', async (a, sid) => { if (connectionsRef.current[sid]) await connectionsRef.current[sid].setRemoteDescription(new RTCSessionDescription(a)); });
                socketRef.current.on('new icecandidate', async (c, sid) => { if (connectionsRef.current[sid]) await connectionsRef.current[sid].addIceCandidate(new RTCIceCandidate(c)); });
                
                socketRef.current.on('remove peer', sid => {
                    if(connectionsRef.current[sid]) { connectionsRef.current[sid].close(); delete connectionsRef.current[sid]; }
                    setRemoteStreams(p => { const n={...p}; delete n[sid]; return n; });
                });

                socketRef.current.on('action', (type, sid, extra) => {
                    setRemoteStreams(prev => {
                        const peer = prev[sid];
                        if (!peer) return prev;
                        const updated = { ...peer };
                        if (type === 'videooff') updated.videoStatus = 'off';
                        if (type === 'videoon') updated.videoStatus = 'on';
                        if (type === 'poorconnection') updated.poorConnection = true;
                        if (type === 'goodconnection') updated.poorConnection = false;
                        return { ...prev, [sid]: updated };
                    });
                });

            } catch (err) { setError(err.message); }
        };

        init();
        return () => {
            mounted = false;
            if(socketRef.current) socketRef.current.disconnect(); 
            if(localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [roomId]);

    // --- Network Quality Monitor ---
    useEffect(() => {
        if (!isJoined) return;
        
        let intervalId;
        let consecutivePoorSamples = 0;
        const POOR_THRESHOLD = 3; // 3 consecutive poor samples to trigger
        
        const checkConnectionQuality = async () => {
            const pcs = Object.values(connectionsRef.current);
            if (pcs.length === 0) return;
            
            let totalPacketsLost = 0;
            let totalPacketsSent = 0;
            
            for (const pc of pcs) {
                try {
                    const stats = await pc.getStats();
                    stats.forEach(report => {
                        if (report.type === 'outbound-rtp' && report.kind === 'video') {
                            totalPacketsSent += report.packetsSent || 0;
                        }
                        if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
                            totalPacketsLost += report.packetsLost || 0;
                        }
                    });
                } catch (e) {}
            }
            
            // Calculate packet loss ratio
            const lossRatio = totalPacketsSent > 0 ? totalPacketsLost / totalPacketsSent : 0;
            const isPoor = lossRatio > 0.1; // >10% loss is considered poor
            
            if (isPoor) {
                consecutivePoorSamples++;
                if (consecutivePoorSamples >= POOR_THRESHOLD && !videoPausedDueToNetwork) {
                    // Auto-pause video
                    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
                    if (videoTrack && videoTrack.enabled) {
                        videoTrack.enabled = false;
                        setVideoOn(false);
                        setVideoPausedDueToNetwork(true);
                        setPoorConnection(true);
                        socketRef.current?.emit('action', 'videooff', roomId);
                        socketRef.current?.emit('action', 'poorconnection', roomId);
                    }
                }
            } else {
                consecutivePoorSamples = 0;
                if (poorConnection) {
                    setPoorConnection(false);
                }
            }
        };
        
        intervalId = setInterval(checkConnectionQuality, 2000); // Check every 2 seconds
        
        return () => clearInterval(intervalId);
    }, [isJoined, videoPausedDueToNetwork, poorConnection, roomId]);


    const createPeerConnection = (sid) => {
        const pc = new RTCPeerConnection(configuration);
        pc.onicecandidate = e => { if(e.candidate) socketRef.current.emit('new icecandidate', e.candidate, sid); };
        pc.onnegotiationneeded = async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit('video-offer', pc.localDescription, sid, myNameRef.current);
        };
        pc.ontrack = e => setRemoteStreams(p => ({...p, [sid]: {...p[sid], stream: e.streams[0]}}));
        return pc;
    };


    // --- Actions ---
    const toggleMic = () => {
        const t = localStreamRef.current?.getAudioTracks()[0];
        if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
    };

    const toggleVideo = () => {
        const t = localStreamRef.current?.getVideoTracks()[0];
        if (t) { t.enabled = !t.enabled; setVideoOn(t.enabled); }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if(!newMessage.trim()) return;
        
        if (chatType === 'private' && privateTarget) {
            socketRef.current.emit('private message', newMessage, privateTarget.id);
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            // Local echo for private messages
            setPrivateMessages(prev => ({
                ...prev,
                [privateTarget.id]: [...(prev[privateTarget.id] || []), { text: newMessage, sender: 'You', time, senderId: socketRef.current.id }]
            }));
        } else {
            socketRef.current.emit('message', newMessage, roomId);
        }
        setNewMessage('');
    };

    const handlePrivateChat = (peer) => {
        setPrivateTarget(peer);
        setChatType('private');
        setShowChat(true);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !socketRef.current) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const buffer = event.target.result;
            const uniqueName = `${Date.now()}_${file.name}`;
            
            socketRef.current.emit('upload', buffer, uniqueName, (status) => {
            if (status.message === 'success') {
                const href = `/files/${uniqueName}`;
                if (chatType === 'private' && privateTarget) {
                    socketRef.current.emit('private message', file.name, privateTarget.id, href);
                    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    setPrivateMessages(prev => ({
                        ...prev,
                        [privateTarget.id]: [...(prev[privateTarget.id] || []), { text: file.name, sender: 'You', time, senderId: socketRef.current.id, href }]
                    }));
                } else {
                    socketRef.current.emit('message', file.name, roomId, href);
                }
            } else {
                alert("File upload failed");
            }
        });
        };
        reader.readAsArrayBuffer(file);
    };

    // --- Render Helpers ---

    if (error) return <div className="admin-wait-overlay"><div className="glass-card wait-card"><h2>Error</h2><p>{error}</p></div></div>;

    // Waiting Screen
    if (isWaiting) {
        return (
            <div className="admin-wait-overlay">
                <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="glass-card wait-card">
                    <Loader2 size={48} className="animate-spin" style={{margin:'0 auto 1rem', color:'#6366f1'}} />
                    <h2>Waiting for Host</h2>
                    <p>The meeting has not started yet. Please wait for the host to join.</p>
                    <button className="btn-secondary" onClick={() => navigate('/')}>Go Back</button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="room-container">
            {/* Main Area */}
            <div className="room-main">
                {/* Whiteboard / Grid */}
                {whiteboardActive ? (
                    <div className="whiteboard-container">
                         <Whiteboard socket={socketRef.current} roomId={roomId} />
                         <div className="pip-container">
                             <video ref={localVideoRef} autoPlay muted playsInline />
                         </div>
                    </div>
                ) : (
                    <div className="video-grid" data-count={Object.keys(remoteStreams).length + 1}>
                        {/* Local Video Card */}
                        <div className="video-card">
                            <video ref={localVideoRef} autoPlay muted playsInline style={{display: videoOn ? 'block' : 'none'}} />
                            {!videoOn && (
                                <div className="avatar-placeholder" style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#333', flexDirection:'column', gap:'12px'}}>
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Me" style={{width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover'}} />
                                    ) : (
                                        <div style={{width:'80px', height:'80px', borderRadius:'50%', background:'#475569', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                            <Users size={40} color="#cbd5e1"/>
                                        </div>
                                    )}
                                    {videoPausedDueToNetwork && (
                                        <div style={{background:'rgba(239,68,68,0.9)', color:'#fff', padding:'8px 16px', borderRadius:'8px', fontSize:'0.75rem', textAlign:'center', maxWidth:'90%'}}>
                                            Poor connection - Video paused
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="video-label">You {micOn ? '' : <MicOff size={14} color="#ea4335" />}</div>
                        </div>
                        {/* Remote Videos */}
                        {Object.values(remoteStreams).map(peer => {
                             const isVideoActive = peer.stream && peer.videoStatus !== 'off';
                             const hasPoorConnection = peer.poorConnection;
                             let displayName = peer.name || 'Guest';
                             
                             return (
                                 <div key={peer.id} className="video-card">
                                     <div className="video-actions-overlay">
                                         <button className="mini-action-btn" onClick={() => handlePrivateChat(peer)} title="Private Message">
                                             <MessageSquare size={14} />
                                         </button>
                                     </div>
                                     {isVideoActive ? (
                                         <VideoElement stream={peer.stream} />
                                     ) : (
                                        <div className="avatar-placeholder" style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#333', flexDirection:'column', gap:'8px'}}>
                                            {peer.photoURL ? (
                                                <img src={peer.photoURL} alt={displayName} style={{width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover'}} />
                                            ) : (
                                                <div style={{width:'80px', height:'80px', borderRadius:'50%', background:'#475569', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                                    <Users size={40} color="#cbd5e1"/>
                                                </div>
                                            )}
                                        </div>
                                     )}
                                     <div className="video-label">{displayName} {hasPoorConnection ? '⚠️' : ''}</div>
                                 </div>
                             );
                        })}
                    </div>
                )}

                {/* Chat Panel */}
                <AnimatePresence>
                    {showChat && (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: 20 }}
                            className="chat-panel"
                        >
                            <div className="chat-header">
                                <h3>{chatType === 'public' ? 'In-call messages' : `Chat with ${privateTarget.name}`}</h3>
                                <button className="control-btn" style={{width: 36, height: 36, background:'transparent'}} onClick={() => setShowChat(false)}><X size={20} color="#5f6368" /></button>
                            </div>
                            
                            <div className="chat-tabs" style={{padding: '8px 16px', display: 'flex', gap: '8px', background: '#f8f9fa'}}>
                                <button onClick={() => setChatType('public')} className={`tab-btn ${chatType==='public'?'active':''}`}>Public</button>
                                {privateTarget && (
                                    <button onClick={() => setChatType('private')} className={`tab-btn ${chatType==='private'?'active':''}`}>Private</button>
                                )}
                            </div>

                            <div className="chat-messages">
                                {(chatType === 'public' ? messages : (privateMessages[privateTarget?.id] || [])).map((m, i) => (
                                    <div key={i} className="msg-bubble">
                                        <div className="msg-sender">{m.sender} • {m.time}</div>
                                        <div className="msg-text">
                                            {m.href ? (
                                                <a href={m.href} download={m.text} target="_blank" rel="noreferrer" style={{color:'var(--meet-primary)', textDecoration:'none', fontWeight:500, display:'flex', alignItems:'center', gap:4}}>
                                                    <Paperclip size={14}/> {m.text} (Download)
                                                </a>
                                            ) : m.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef}/>
                            </div>
                            
                            <form className="chat-input-area" onSubmit={sendMessage}>
                                <label style={{cursor:'pointer', color:'#5f6368'}}>
                                    <Paperclip size={20}/>
                                    <input type="file" hidden onChange={handleFileUpload} />
                                </label>
                                <input 
                                    type="text"
                                    value={newMessage} 
                                    onChange={e=>setNewMessage(e.target.value)} 
                                    placeholder="Send a message to everyone" 
                                />
                                <button type="submit" style={{background:'none', border:'none', color: newMessage.trim() ? 'var(--meet-primary)' : '#5f6368', cursor:'pointer'}}>
                                    <Send size={20}/>
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Bar: Google Meet Style */}
            <div className="room-controls">
                <div className="controls-left">
                    <span style={{fontWeight:500}}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span style={{opacity:0.6}}>|</span>
                    <span style={{fontWeight:500, letterSpacing:'0.5px'}}>{roomId}</span>
                </div>

                <div className="controls-center">
                    <button className={`control-btn ${!micOn?'off':''}`} onClick={toggleMic} title={micOn?'Mute':'Unmute'}>
                        {micOn ? <Mic size={20}/> : <MicOff size={20}/>}
                    </button>
                    <button className={`control-btn ${!videoOn?'off':''}`} onClick={toggleVideo} title={videoOn?'Stop Camera':'Start Camera'}>
                        {videoOn ? <Video size={20}/> : <VideoOff size={20}/>}
                    </button>
                    <button className={`control-btn ${whiteboardActive?'active':''}`} onClick={() => setWhiteboardActive(!whiteboardActive)} title="Whiteboard">
                        <Edit3 size={20}/>
                    </button>
                    <button className="control-btn hang-up" onClick={() => navigate('/')} title="Leave call">
                        <PhoneOff size={24}/>
                    </button>
                </div>

                <div className="controls-right">
                    <button className="control-btn" style={{background:'transparent'}} onClick={() => {}} title="Meeting Details">
                        <Settings size={20}/>
                    </button>
                    <button className="control-btn" style={{background:'transparent'}} onClick={() => {}} title="Participants">
                        <Users size={20}/>
                    </button>
                    <button className={`control-btn ${showChat?'active':''}`} style={{background: showChat ? 'var(--meet-primary)' : 'transparent', color: showChat ? 'var(--meet-bg)' : 'white'}} onClick={() => setShowChat(!showChat)} title="Chat">
                        <MessageSquare size={20}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Simple Video Element Wrapper
const VideoElement = ({ stream }) => {
    const ref = useRef();
    useEffect(() => { if(ref.current) ref.current.srcObject = stream; }, [stream]);
    return <video ref={ref} autoPlay playsInline style={{width:'100%', height:'100%', objectFit:'cover'}} />;
};

export default Room;
