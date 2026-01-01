import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
    Settings, Share2, Monitor,
    Edit3, Paperclip, Send, Download, Loader2,
    WifiOff, ShieldCheck, FileText, XCircle,
    Sparkles, Trash2, UserMinus, Check, X, Search, Users
} from 'lucide-react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import Whiteboard from '../components/Room/Whiteboard';
import './Room.css';
import moment from 'moment';

const Room = ({ user }) => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    // App States
    const [hardwareReady, setHardwareReady] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isRoomAdmin, setIsRoomAdmin] = useState(false);

    // UI State
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [chatType, setChatType] = useState('public');
    const [privateTarget, setPrivateTarget] = useState(null);
    const [showBoard, setShowBoard] = useState(false);
    const [messages, setMessages] = useState([]);
    const [privateMessages, setPrivateMessages] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [remoteStreams, setRemoteStreams] = useState({});
    const [error, setError] = useState(null);


    // Effects State
    const [activeFilter, setActiveFilter] = useState('none'); // 'none', 'blur'
    const [showEffects, setShowEffects] = useState(false);

    // Speaker States
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakers, setSpeakers] = useState({});
    const [isScreenSharing, setIsScreenSharing] = useState(false);

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

    const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] };

    // --- Background Blur Logic (MediaPipe) ---
    useEffect(() => {
        if (!window.SelfieSegmentation) return;

        const selfieSegmentation = new window.SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });

        selfieSegmentation.setOptions({ modelSelection: 1 });
        selfieSegmentation.onResults((results) => {
            const canvas = localCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw segmentation mask
            ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

            // Background
            ctx.globalCompositeOperation = 'source-out';
            ctx.filter = 'blur(12px)';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

            // Foreground (Person)
            ctx.globalCompositeOperation = 'destination-atop';
            ctx.filter = 'none';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

            ctx.restore();
        });

        segmentationRef.current = selfieSegmentation;
    }, []);

    const processFrame = useCallback(async () => {
        if (activeFilter === 'blur' && segmentationRef.current && localVideoRef.current && localVideoRef.current.readyState >= 2) {
            try {
                await segmentationRef.current.send({ image: localVideoRef.current });
            } catch (e) {
                // Ignore transient errors
            }
        }
        if (activeFilter === 'blur') {
            requestAnimationFrame(processFrame);
        }
    }, [activeFilter]);

    useEffect(() => {
        if (activeFilter === 'blur') {
            requestAnimationFrame(processFrame);
        }
    }, [processFrame, activeFilter]);

    // Scroll to bottom
    useEffect(() => {
        if (showChat) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, privateMessages, showChat, chatType, privateTarget]);

    useEffect(() => {
        let mounted = true;
        let audioCtx, analyser, dataArray, rafId;

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 360, frameRate: { ideal: 24, max: 30 } },
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
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
                        const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                        const currentlySpeaking = average > 40;
                        if (currentlySpeaking !== isSpeakingRef.current) {
                            isSpeakingRef.current = currentlySpeaking;
                            setIsSpeaking(currentlySpeaking);
                            socketRef.current?.emit('speaking', currentlySpeaking);
                        }
                        rafId = requestAnimationFrame(checkSpeaking);
                    };
                    checkSpeaking();
                } catch (e) { console.warn(e); }

                socketRef.current = io();

                socketRef.current.on('connect', () => {
                    setIsConnected(true);
                    socketRef.current.emit('join room', roomId, myNameRef.current, user?.isAdmin);
                });

                socketRef.current.on('join room', (otherUsers, names, mics, videos, isAdmin) => {
                    if (mounted) { setIsRoomAdmin(isAdmin); setIsJoined(true); }
                    if (otherUsers) {
                        otherUsers.forEach(id => {
                            setRemoteStreams(prev => ({ ...prev, [id]: { name: names[id], id } }));
                            const pc = createPeerConnection(id);
                            connectionsRef.current[id] = pc;
                            stream.getTracks().forEach(track => pc.addTrack(track, stream));
                        });
                    }
                });

                socketRef.current.on('message', (msg, sender, time, href, senderId) => {
                    if (mounted) {
                        setMessages(prev => {
                            // If it's from us, it might be a duplicate of the local echo
                            if (senderId === socketRef.current.id) return prev;
                            return [...prev, { text: msg, sender, time, href, senderId }];
                        });
                    }
                });

                socketRef.current.on('message-deleted', (index) => {
                    setMessages(prev => prev.filter((_, i) => i !== index));
                });


                socketRef.current.on('private message', (msg, sender, time, senderId, targetId, isAdminMirror) => {
                    if (mounted) {
                        const partnerId = isAdminMirror ? senderId : (senderId === socketRef.current.id ? targetId : senderId);
                        setPrivateMessages(prev => {
                            const updated = { ...prev };
                            if (!updated[partnerId]) updated[partnerId] = [];
                            updated[partnerId].push({ text: msg, sender, time, senderId, isAdminMirror });
                            return updated;
                        });
                    }
                });

                socketRef.current.on('kicked', () => {
                    alert("You have been removed from the meeting by the administrator.");
                    navigate('/');
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

                socketRef.current.on('video-answer', async (answer, sid) => {
                    if (connectionsRef.current[sid]) await connectionsRef.current[sid].setRemoteDescription(new RTCSessionDescription(answer));
                });

                socketRef.current.on('new icecandidate', async (candidate, sid) => {
                    if (connectionsRef.current[sid]) await connectionsRef.current[sid].addIceCandidate(new RTCIceCandidate(candidate));
                });

                socketRef.current.on('speaking', (sid, speaking) => setSpeakers(prev => ({ ...prev, [sid]: speaking })));

                socketRef.current.on('action', (type, sid, extra) => {
                    setRemoteStreams(prev => {
                        const u = prev[sid] || {};
                        if (type === 'mute') u.mic = 'off';
                        else if (type === 'unmute') u.mic = 'on';
                        else if (type === 'videooff') u.video = 'off';
                        else if (type === 'videoon') u.video = 'on';
                        else if (type === 'filter') u.filter = extra;
                        else if (type === 'screenshare-on') { u.isScreenSharing = true; u.filter = 'none'; }
                        else if (type === 'screenshare-off') u.isScreenSharing = false;
                        return { ...prev, [sid]: { ...u } };
                    });
                });

                socketRef.current.on('remove peer', sid => {
                    if (connectionsRef.current[sid]) { connectionsRef.current[sid].close(); delete connectionsRef.current[sid]; }
                    if (mounted) {
                        setRemoteStreams(prev => { const n = { ...prev }; delete n[sid]; return n; });
                        setSpeakers(prev => { const n = { ...prev }; delete n[sid]; return n; });
                    }
                });

            } catch (err) { if (mounted) setError(err.message); }
        };

        init();

        return () => {
            mounted = false;
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
            if (socketRef.current) socketRef.current.disconnect();
            if (audioCtx) audioCtx.close();
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [roomId]);

    const createPeerConnection = (sid) => {
        const pc = new RTCPeerConnection(configuration);
        pc.onicecandidate = (e) => { if (e.candidate) socketRef.current.emit('new icecandidate', e.candidate, sid); };
        pc.onnegotiationneeded = async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit('video-offer', pc.localDescription, sid, myNameRef.current);
        };
        pc.ontrack = (e) => { setRemoteStreams(prev => ({ ...prev, [sid]: { ...prev[sid], stream: e.streams[0] } })); };
        return pc;
    };

    const toggleMic = () => {
        const t = localStreamRef.current?.getAudioTracks()[0];
        if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); socketRef.current?.emit('action', t.enabled ? 'unmute' : 'mute', roomId); }
    };

    const toggleVideo = () => {
        const t = localStreamRef.current?.getVideoTracks()[0];
        if (t) { t.enabled = !t.enabled; setVideoOn(t.enabled); socketRef.current?.emit('action', t.enabled ? 'videoon' : 'videooff', roomId); }
    };

    const applyEffect = (effect) => {
        setActiveFilter(effect);
        socketRef.current?.emit('action', 'filter', roomId, effect);
        setShowEffects(false);
    };

    const stopScreenShare = () => {
        if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
        }
        setIsScreenSharing(false);
        socketRef.current?.emit('action', 'screenshare-off', roomId); // Signal OFF

        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
            Object.values(connectionsRef.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(videoTrack);
            });
        }
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            stopScreenShare();
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrackRef.current = screenTrack;
                setIsScreenSharing(true);
                setActiveFilter('none'); // Disable local blur
                socketRef.current?.emit('action', 'filter', roomId, 'none'); // Tell others to disable blur
                socketRef.current?.emit('action', 'screenshare-on', roomId); // Signal ON

                if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
                Object.values(connectionsRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                });
                screenTrack.onended = () => stopScreenShare();
            } catch (err) {
                console.error("Screen share failed", err);
            }
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socketRef.current) return;
        const msgText = newMessage.trim();

        if (chatType === 'public') {
            socketRef.current.emit('message', msgText, roomId);
            // Local echo for immediate visibility
            setMessages(prev => [...prev, {
                text: msgText,
                sender: "You",
                time: moment().format("h:mm a"),
                senderId: socketRef.current.id
            }]);
        } else if (privateTarget) {
            socketRef.current.emit('private message', msgText, privateTarget.id);
            setPrivateMessages(prev => {
                const partnerId = privateTarget.id;
                const updated = { ...prev };
                if (!updated[partnerId]) updated[partnerId] = [];
                updated[partnerId].push({
                    text: msgText,
                    sender: "You",
                    time: moment().format("h:mm a"),
                    senderId: socketRef.current.id
                });
                return updated;
            });
        }
        setNewMessage('');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !socketRef.current) return;
        const fileName = `${file.name.split('.')[0]}_${Date.now()}.${file.name.split('.').pop()}`;
        socketRef.current.emit('upload', file, fileName, (status) => {
            if (status.message === 'success') {
                const href = `/files/${fileName}`;
                socketRef.current.emit('message', file.name, roomId, href);
            }
        });
    };


    const deleteMessage = (i) => {
        if (!isRoomAdmin) return;
        socketRef.current.emit('delete-message', i);
    };

    const kickUser = (sid) => {
        if (!isRoomAdmin) return;
        if (window.confirm("Are you sure you want to remove this participant?")) {
            socketRef.current.emit('kick-user', sid);
        }
    };

    const activeMessages = chatType === 'public' ? messages : (privateMessages[privateTarget?.id] || []);
    const sortedRemoteSids = Object.keys(remoteStreams).sort((a, b) => (speakers[b] ? 1 : 0) - (speakers[a] ? 1 : 0));

    const isAnyoneSharing = isScreenSharing || Object.values(remoteStreams).some(r => r.isScreenSharing);
    const activeSharerId = isScreenSharing ? 'local' : Object.keys(remoteStreams).find(id => remoteStreams[id].isScreenSharing);

    // Auto-scroll to pinned view if sharing starts
    useEffect(() => {
        if (isAnyoneSharing) {
            document.querySelector('.snap-container')?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [isAnyoneSharing]);

    const renderVideoGrid = () => (
        <div className={`video-grid ${showChat ? 'with-chat' : ''}`}>
            <div className={`video-card local-video ${isSpeaking ? 'speaking' : ''}`}>
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                        display: activeFilter === 'none' && videoOn ? 'block' : 'none',
                        position: activeFilter === 'blur' ? 'absolute' : 'relative',
                        opacity: activeFilter === 'blur' ? 0 : 1,
                        width: '100%',
                        height: '100%'
                    }}
                />
                {activeFilter === 'blur' && (
                    <canvas ref={localCanvasRef} width="640" height="360" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                {!videoOn && activeFilter === 'none' && <div className="avatar-placeholder">{myNameRef.current?.[0] || 'Y'}</div>}
                {!micOn && <div className="mute-mini-icon"><MicOff size={16} /></div>}
                <div className="video-label">You</div>
            </div>
            {sortedRemoteSids.map(sid => (
                <div key={sid} className={`video-card remote-video ${speakers[sid] ? 'speaking' : ''}`}>
                    {remoteStreams[sid].stream && remoteStreams[sid].video !== 'off' ? <VideoElement stream={remoteStreams[sid].stream} filter={remoteStreams[sid].filter} /> : <div className="avatar-placeholder">{remoteStreams[sid].name?.[0] || 'G'}</div>}
                    {remoteStreams[sid].mic === 'off' && <div className="mute-mini-icon"><MicOff size={16} /></div>}
                    <div className="video-label">
                        <span>{remoteStreams[sid].name}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="mini-icon-btn" onClick={() => { setPrivateTarget({ id: sid, name: remoteStreams[sid].name }); setChatType('private'); setShowChat(true); }}><MessageSquare size={14} /></button>
                            {isRoomAdmin && <button className="mini-icon-btn kick-btn" onClick={() => kickUser(sid)}><UserMinus size={14} /></button>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    if (error) return <div className="admin-wait-overlay"><div className="glass-card wait-card"><h2>Camera Error</h2><p>{error}</p></div></div>;

    return (
        <div className="room-container">
            {!hardwareReady && <div className="admin-wait-overlay"><div className="glass-card wait-card"><Loader2 size={60} className="animate-spin" /><h2>Joining...</h2></div></div>}

            <div className="room-header">
                <div className="room-info">
                    <h2>Room: <span>{roomId}</span></h2>
                    <div className="status-badge"><div className="pulse-dot" /><span>{Object.keys(remoteStreams).length + 1} Inside</span></div>
                    {isRoomAdmin && <span className="admin-badge"><ShieldCheck size={14} /> HOST</span>}
                    {isAnyoneSharing && <div className="sharing-indicator">Screen Share Active</div>}
                </div>
                <div className="room-actions">
                    <button className="btn-secondary" onClick={() => setShowBoard(!showBoard)}><Edit3 size={18} /> {showBoard ? 'Grid' : 'Board'}</button>
                    <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(roomId)}><Share2 size={16} /> ID</button>
                </div>
            </div>

            <div className="room-main">
                {showBoard ? <Whiteboard socket={socketRef.current} roomId={roomId} /> : (
                    <>
                        {isAnyoneSharing ? (
                            <div className="snap-container">
                                {/* SECTION 1: PINNED VIEW */}
                                <section className="snap-section pinned-section">
                                    <div className="pinned-video-container">
                                        {activeSharerId === 'local' ? (
                                            <video ref={localVideoRef} autoPlay muted playsInline className="pinned-video" />
                                        ) : (
                                            activeSharerId && remoteStreams[activeSharerId] ? (
                                                <VideoElement stream={remoteStreams[activeSharerId].stream} filter={remoteStreams[activeSharerId].filter} isPinned={true} />
                                            ) : <div className="loading-share">Loading Share...</div>
                                        )}
                                        <div className="pinned-label">
                                            <Monitor size={16} />
                                            Currently Presenting: {activeSharerId === 'local' ? "You" : remoteStreams[activeSharerId]?.name}
                                        </div>
                                    </div>
                                    <div className="scroll-hint">Scroll down for Lobby View ↓</div>
                                </section>

                                {/* SECTION 2: LOBBY GRID */}
                                <section className="snap-section grid-section">
                                    <h3 className="section-title">Lobby View</h3>
                                    {renderVideoGrid()}
                                </section>
                            </div>
                        ) : (
                            // NORMAL VIEW (No one sharing)
                            renderVideoGrid()
                        )}
                    </>
                )}

                <AnimatePresence>
                    {showChat && (
                        <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="chat-panel glass-card">
                            <div className="chat-header">
                                <h3>{chatType === 'public' ? 'Group Chat' : `Direct: ${privateTarget?.name}`}</h3>
                                <button onClick={() => setShowChat(false)} className="close-btn">&times;</button>
                            </div>

                            <div className="chat-user-selector">
                                <div className={`user-select-btn ${chatType === 'public' ? 'active' : ''}`} onClick={() => { setChatType('public'); setPrivateTarget(null); }}>
                                    <Users size={16} /> Everyone
                                </div>
                                <div className="user-search-container">
                                    <Search size={14} className="search-icon" />
                                    <select
                                        className="user-select-dropdown"
                                        value={privateTarget?.id || ""}
                                        onChange={(e) => {
                                            const sid = e.target.value;
                                            if (sid) {
                                                const name = remoteStreams[sid]?.name || "User";
                                                setPrivateTarget({ id: sid, name });
                                                setChatType('private');
                                            } else {
                                                setChatType('public');
                                                setPrivateTarget(null);
                                            }
                                        }}
                                    >
                                        <option value="">Direct Message...</option>
                                        {sortedRemoteSids.map(sid => (
                                            <option key={sid} value={sid}>
                                                {remoteStreams[sid].name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="chat-messages">
                                {activeMessages.map((msg, i) => (
                                    <div key={i} className={`msg-bubble ${msg.senderId === socketRef.current?.id ? 'outgoing' : 'incoming'}`}>
                                        <div className="msg-sender">
                                            {msg.sender}
                                            {isRoomAdmin && <button className="delete-msg-btn" onClick={() => deleteMessage(i)}><Trash2 size={12} /></button>}
                                        </div>
                                        <div className="msg-text">
                                            {msg.href ? <a href={msg.href} download={msg.text} className="file-link"><FileText size={18} /> <div>{msg.text}</div> <Download size={16} /></a> : msg.text}
                                        </div>
                                        <div className="msg-time">{msg.time}</div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="chat-input-area">
                                <label className="icon-btn-glass"><Paperclip size={20} /><input type="file" hidden onChange={handleFileUpload} /></label>
                                <form onSubmit={sendMessage} style={{ flex: 1, display: 'flex', gap: '8px' }}>
                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type..." />
                                    <button type="submit" className="btn-primary"><Send size={18} /></button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="room-controls">
                <button className={`control-btn ${!micOn ? 'off' : ''}`} onClick={toggleMic}>{micOn ? <Mic /> : <MicOff />}</button>
                <button className={`control-btn ${!videoOn ? 'off' : ''}`} onClick={toggleVideo}>{videoOn ? <Video /> : <VideoOff />}</button>
                <button className={`control-btn ${isScreenSharing ? 'active' : ''}`} onClick={toggleScreenShare}><Monitor /></button>
                <button className={`control-btn ${showEffects ? 'active' : ''}`} onClick={() => setShowEffects(!showEffects)}><Sparkles /></button>

                <AnimatePresence>
                    {showEffects && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="effects-popover glass-card" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                            <div className="effect-option" onClick={() => applyEffect('none')}><XCircle size={18} /> Regular</div>
                            <div className="effect-option" onClick={() => applyEffect('blur')}><Sparkles size={18} /> AI Background Blur</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button className="control-btn hang-up" onClick={() => navigate('/')}><PhoneOff /></button>
                <button className={`control-btn ${showChat ? 'active' : ''}`} onClick={() => setShowChat(!showChat)}><MessageSquare /></button>
            </div>
        </div>
    );
};


const VideoElement = ({ stream, filter, isPinned }) => {
    const videoRef = useRef();
    const canvasRef = useRef(null);
    const segmentationRef = useRef(null);

    useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);

    useEffect(() => {
        if (filter === 'blur' && window.SelfieSegmentation) {
            const selfieSegmentation = new window.SelfieSegmentation({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
            });
            selfieSegmentation.setOptions({ modelSelection: 1 });
            selfieSegmentation.onResults((results) => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                ctx.save();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = 'source-out';
                ctx.filter = 'blur(10px)';
                ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = 'destination-atop';
                ctx.filter = 'none';
                ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            });
            segmentationRef.current = selfieSegmentation;
        }
    }, [filter]);

    const processRem = useCallback(async () => {
        if (filter === 'blur' && segmentationRef.current && videoRef.current && videoRef.current.readyState >= 2) {
            await segmentationRef.current.send({ image: videoRef.current });
        }
        requestAnimationFrame(processRem);
    }, [filter]);

    useEffect(() => { requestAnimationFrame(processRem); }, [processRem]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                    display: (filter === 'none' || isPinned) ? 'block' : 'none',
                    position: (filter === 'blur' && !isPinned) ? 'absolute' : 'relative',
                    opacity: (filter === 'blur' && !isPinned) ? 0 : 1,
                    width: '100%',
                    height: '100%',
                    objectFit: isPinned ? 'contain' : 'cover'
                }}
            />
            {filter === 'blur' && !isPinned && (
                <canvas ref={canvasRef} width="640" height="360" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
        </div>
    );
};

export default Room;
