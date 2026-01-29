import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
    Settings, Share2, Monitor, Home, Shield,
    Edit3, Paperclip, Send, Download, Loader2,
    WifiOff, ShieldCheck, FileText, XCircle,
    Sparkles, Trash2, UserMinus, Check, X, Search, Users, Copy, Calendar, ChevronDown
} from 'lucide-react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import Whiteboard from '../components/Room/Whiteboard';
import './Room.css';

const Room = ({ user }) => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const query = new URLSearchParams(window.location.search);
    const isHostDirect = query.get('host') === 'true';

    const [hardwareReady, setHardwareReady] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isRoomAdmin, setIsRoomAdmin] = useState(isHostDirect);
    const [isWaiting, setIsWaiting] = useState(!isHostDirect); // Hosts don't wait

    // --- UI States ---
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [chatBlocked, setChatBlocked] = useState(false);
    const [chatType, setChatType] = useState('public');
    const [privateTarget, setPrivateTarget] = useState(null);
    const [whiteboardActive, setWhiteboardActive] = useState(false);
    const [messages, setMessages] = useState([]);
    const [privateMessages, setPrivateMessages] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState(null);
    const [showParticipants, setShowParticipants] = useState(false);
    const [coAdmins, setCoAdmins] = useState([]); // Array of socket IDs

    // MS Teams Style Features
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [reactions, setReactions] = useState([]); // [{id, emoji, sid}]
    const [inLobby, setInLobby] = useState(false);
    const [lobbyRequests, setLobbyRequests] = useState([]); // [{sid, name, photoURL}]
    const [isRestrictedMode, setIsRestrictedMode] = useState(false); // Lobby mode vs Open
    const [captionsActive, setCaptionsActive] = useState(false);
    const [captionText, setCaptionText] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [pushToTalk, setPushToTalk] = useState(false);
    const [devices, setDevices] = useState({ mic: '', speaker: '', video: '' });
    const [availableDevices, setAvailableDevices] = useState({ mics: [], speakers: [], videos: [] });
    
    // UI Effects
    const [activeFilter, setActiveFilter] = useState('none');
    const [poorConnection, setPoorConnection] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isSharingScreen, setIsSharingScreen] = useState(false);
    const [cameraMode, setCameraMode] = useState('original'); // original, blur, brighten, mirror
    const [showCameraOptions, setShowCameraOptions] = useState(false);
    const [adminBlockedFilters, setAdminBlockedFilters] = useState(false);

    // Refs
    const socketRef = useRef();
    const recognitionRef = useRef(null);
    const localStreamRef = useRef();
    const connectionsRef = useRef({});
    const localVideoRef = useRef();
    const localCanvasRef = useRef(null);
    const chatEndRef = useRef();
    const myNameRef = useRef(user?.displayName || `Guest_${Math.floor(Math.random() * 1000)}`);
    const isSpeakingRef = useRef(false);
    const segmentationRef = useRef(null);
    const screenTrackRef = useRef();
    // Simplified Local Video Attachment: Pure Callback Ref approach
    const setLocalVideoTarget = useCallback((el) => {
        if (!el) return;
        localVideoRef.current = el;
        
        // Immediate attachment if stream exists
        if (localStreamRef.current) {
            el.srcObject = localStreamRef.current;
            console.log("Local camera attached successfully via Callback Ref");
        }
    }, []); // Identity remains constant

    // If stream arrives after mount, this effect ensures update
    useEffect(() => {
        if (hardwareReady && localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
        }
    }, [hardwareReady, whiteboardActive]); // Re-attach on tool toggle

    const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] };

    // Device Discovery
    useEffect(() => {
        const getDevices = async () => {
            try {
                const dev = await navigator.mediaDevices.enumerateDevices();
                setAvailableDevices({
                    mics: dev.filter(d => d.kind === 'audioinput'),
                    speakers: dev.filter(d => d.kind === 'audiooutput'),
                    videos: dev.filter(d => d.kind === 'videoinput')
                });
            } catch (err) { console.warn("Device enumeration failed:", err); }
        };
        getDevices();
    }, []);

    // Speech Recognition (Captions)
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) return;
        const rec = new window.webkitSpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresults = (event) => {
            const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
            setCaptionText(transcript);
        };
        recognitionRef.current = rec;
    }, []);

    useEffect(() => {
        if (captionsActive) recognitionRef.current?.start();
        else recognitionRef.current?.stop();
    }, [captionsActive]);

    // Socket Initialization
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            console.log("Video-Optimized Initialization...");
            try {
                // Pre-warm hardware if permissions exist to make video toggle 'instant'
                try {
                    const camPerm = await navigator.permissions.query({ name: 'camera' });
                    if (camPerm.state === 'granted') {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                        localStreamRef.current = stream;
                        // Initialized as true since user wants instant startup
                        stream.getTracks().forEach(t => t.enabled = true);
                        if (localVideoRef.current) {
                            localVideoRef.current.srcObject = stream;
                            localVideoRef.current.play().catch(() => {});
                        }
                        console.log("Hardware pre-warmed and ACTIVE");
                    } else if (micOn || videoOn) {
                        // If not granted but state is true, try to start normally
                        startHardware();
                    }
                } catch (e) { 
                    console.log("Pre-warm skipped, starting normally...");
                    if (micOn || videoOn) startHardware();
                }

                setHardwareReady(true);
                console.log("Hardware Ready (Pre-warmed or Manual mode active)");

                socketRef.current = io();

                socketRef.current.on('connect', () => {
                    setIsConnected(true);
                    console.log("Socket connected:", socketRef.current.id);
                    const q = new URLSearchParams(window.location.search);
                    const isNowHost = isAdminRef.current || q.get('host') === 'true';
                    const isClosed = q.get('mode') === 'closed';
                    socketRef.current.emit('join room', roomId, myNameRef.current, isNowHost, user?.photoURL, isClosed);
                    if (isNowHost) {
                        socketRef.current.emit('update-settings', { restricted: isRestrictedMode });
                    }
                });

                socketRef.current.on('admin-settings-update', (settings) => {
                    if (settings.blockFilters !== undefined) setAdminBlockedFilters(settings.blockFilters);
                });

                socketRef.current.on('waiting-lobby', () => {
                    console.log("Entered lobby waiting state.");
                    setInLobby(true);
                });

                socketRef.current.on('admitted', () => {
                    console.log("Admitted to room from lobby.");
                    setInLobby(false);
                    setIsJoined(true);
                    setIsWaiting(false);
                });

                socketRef.current.on('room-started', () => {
                    console.log("Room has been started by host. Joining...");
                    setIsWaiting(false);
                    setIsJoined(true);
                });

                socketRef.current.on('join room', (otherUsers, names, mics, videos, isAdmin, isActive, photos) => {
                    if (mounted) {
                        const q = new URLSearchParams(window.location.search);
                        const forcedHost = q.get('host') === 'true';
                        const amIAdmin = isAdmin || isAdminRef.current || forcedHost;
                        
                        setIsRoomAdmin(amIAdmin);
                        isAdminRef.current = amIAdmin;
                        console.log("Join Room Status Sync:", { amIAdmin, isActive, forcedHost });

                        // If I'm the host OR the room is already active, stop waiting
                        if (amIAdmin || isActive) {
                            setIsWaiting(false);
                            setIsJoined(true);
                            console.log("Entry Granted: Admin or Active Room");
                        } else {
                            // Only put in waiting if NOT a host
                            if (!forcedHost) {
                                setIsWaiting(true);
                                console.log("Entry Denied: Waiting for Host");
                            } else {
                                setIsWaiting(false);
                                setIsJoined(true);
                            }
                        }

                        if (otherUsers && localStreamRef.current) {
                            otherUsers.forEach(id => {
                                setRemoteStreams(prev => ({ ...prev, [id]: { name: names[id], id, photoURL: photos ? photos[id] : null } }));
                                const pc = createPeerConnection(id);
                                connectionsRef.current[id] = pc;
                                localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
                            });
                        }
                    }
                });

                socketRef.current.on('lobby-request', (req) => {
                    console.log("New lobby request:", req);
                    setLobbyRequests(prev => [...prev, req]);
                    // Play notification sound
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                    audio.play().catch(e => console.log("Sound play error", e));
                });

                socketRef.current.on('hand-status', ({ sid, isRaised }) => {
                    setRemoteStreams(prev => {
                        if (!prev[sid]) return prev;
                        return { ...prev, [sid]: { ...prev[sid], isHandRaised: isRaised }};
                    });
                });

                socketRef.current.on('reaction', ({ sid, emoji }) => {
                    const id = Date.now();
                    setReactions(prev => [...prev, { id, emoji, sid }]);
                    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
                });

                socketRef.current.on('chat-status', (isBlocked) => setChatBlocked(isBlocked));

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
                   if (localStreamRef.current) {
                       localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
                   }
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

                socketRef.current.on('speaking', (sid, isSpeaking) => {
                    setRemoteStreams(prev => {
                        if (!prev[sid]) return prev;
                        return { ...prev, [sid]: { ...prev[sid], isSpeaking }};
                    });
                });

                socketRef.current.on('sharing', (sid, isSharing) => {
                    setRemoteStreams(prev => {
                        if (!prev[sid]) return prev;
                        return { ...prev, [sid]: { ...prev[sid], isSharing }};
                    });
                });

                socketRef.current.on('coadmin-promoted', (sid) => {
                   setCoAdmins(prev => [...new Set([...prev, sid])]);
                });

                socketRef.current.on('admin-action', (type) => {
                    if (type === 'mute') {
                        const track = localStreamRef.current?.getAudioTracks()[0];
                        if (track) { track.enabled = false; setMicOn(false); }
                    }
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

    // --- Speech Detection & Speaking Status ---
    useEffect(() => {
        if (!micOn || !localStreamRef.current) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(localStreamRef.current);
        source.connect(analyser);
        analyser.fftSize = 512;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let previousSpeaking = false;
        const checkSpeaking = () => {
            analyser.getByteFrequencyData(dataArray);
            const volume = dataArray.reduce((p, c) => p + c, 0) / bufferLength;
            const isSpeaking = volume > 20; // Threshold

            if (isSpeaking !== previousSpeaking) {
                previousSpeaking = isSpeaking;
                isSpeakingRef.current = isSpeaking;
                socketRef.current.emit('speaking', isSpeaking);
            }
            if (micOn) requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();
        
        return () => audioContext.close();
    }, [micOn, hardwareReady]);

    // --- Auto FullScreen & UI Mode ---
    useEffect(() => {
        if (isJoined && !isFullScreen) {
            const el = document.documentElement;
            if (el.requestFullscreen) {
                el.requestFullscreen().catch(() => {});
                setIsFullScreen(true);
            }
        }
    }, [isJoined]);

    useEffect(() => {
        const handleFS = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

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
                    console.warn("Poor network detected. Auto-pausing video to preserve audio quality.");
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
                if (videoPausedDueToNetwork) {
                    console.log("Network quality recovered. Restoring video...");
                    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.enabled = true;
                        setVideoOn(true);
                        setVideoPausedDueToNetwork(false);
                    }
                }
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
    const startHardware = async (type) => { // 'video' or 'audio'
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: type === 'video' || videoOn, 
                audio: type === 'audio' || micOn 
            });
            
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            
            // Re-negotiate with all peers
            Object.values(connectionsRef.current).forEach(pc => {
                stream.getTracks().forEach(track => {
                    const senders = pc.getSenders();
                    const existing = senders.find(s => s.track?.kind === track.kind);
                    if (existing) {
                        existing.replaceTrack(track);
                    } else {
                        pc.addTrack(track, stream);
                    }
                });
            });
            return true;
        } catch (err) {
            console.error("Hardware access denied:", err);
            setError("Please allow camera and microphone access in your browser to participate.");
            return false;
        }
    };

    const toggleMic = async () => {
        if (!localStreamRef.current || !localStreamRef.current.getAudioTracks()[0]) {
            const success = await startHardware('audio');
            if (success) setMicOn(true);
            return;
        }
        const t = localStreamRef.current.getAudioTracks()[0];
        t.enabled = !t.enabled;
        setMicOn(t.enabled);
        socketRef.current.emit('action', t.enabled ? 'videoon' : 'videooff'); // Re-using videooff for mic status for simplicity or add 'micoff'
    };

    const toggleVideo = async () => {
        if (!localStreamRef.current || !localStreamRef.current.getVideoTracks()[0]) {
            const success = await startHardware('video');
            if (success) setVideoOn(true);
            return;
        }
        const t = localStreamRef.current.getVideoTracks()[0];
        t.enabled = !t.enabled;
        setVideoOn(t.enabled);
        socketRef.current.emit('action', t.enabled ? 'videoon' : 'videooff');
    };

    const startScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];
            
            // Replace track in all peer connections
            Object.values(connectionsRef.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack);
            });

            screenTrack.onended = () => stopScreenShare();
            screenTrackRef.current = screenTrack;
            setIsSharingScreen(true);
            
            localStreamRef.current = screenStream;
            if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
            socketRef.current.emit('sharing', true);
        } catch (err) {
            console.error("Screen share failed:", err);
        }
    };

    const stopScreenShare = () => {
        if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            const videoTrack = localStreamRef.current?.getVideoTracks()[0];
            Object.values(connectionsRef.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender && videoTrack) sender.replaceTrack(videoTrack);
            });
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
            setIsSharingScreen(false);
            socketRef.current.emit('sharing', false);
        }
    };

    const sendMessage = (e) => {
        if (e) e.preventDefault();
        if(!newMessage.trim()) return;
        
        if (chatType === 'private' && privateTarget) {
            socketRef.current.emit('private message', newMessage, privateTarget.id);
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            // Local echo for private messages
            setPrivateMessages(prev => ({
                ...prev,
                [privateTarget.id]: [...(prev[privateTarget.id] || []), { text: newMessage, sender: 'You (Private)', time, senderId: socketRef.current.id }]
            }));
            setMessages(prev => [...prev, { text: `[Private to ${privateTarget.name}]: ${newMessage}`, sender: 'You', isPrivate: true }]);
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

    // Waiting Screen - Enhanced with Video Preview
    if (isWaiting) {
        return (
            <div className="admin-wait-overlay">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="glass-card wait-card premium-wait"
                    style={{ maxWidth: '600px', width: '90%', padding: '40px' }}
                >
                    <div className="preview-container" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                        <video 
                            ref={setLocalVideoTarget} 
                            autoPlay 
                            muted 
                            playsInline 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />
                        <div className="preview-controls" style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px' }}>
                            <button className={`icon-btn-glass ${!micOn ? 'off' : ''}`} onClick={toggleMic} style={{ width: '45px', height: '45px', background: !micOn ? 'var(--error)' : 'rgba(255,255,255,0.2)' }}>
                                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>
                            <button className={`icon-btn-glass ${!videoOn ? 'off' : ''}`} onClick={toggleVideo} style={{ width: '45px', height: '45px', background: !videoOn ? 'var(--error)' : 'rgba(255,255,255,0.2)' }}>
                                {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                            </button>
                        </div>
                        {!hardwareReady && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                                <Loader2 size={40} className="animate-spin" color="white" />
                            </div>
                        )}
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Ready to join?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                            {isHostDirect ? "Initializing your host session..." : "The meeting hasn't started yet. We'll let you in once the host arrives."}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => navigate('/')} style={{ padding: '12px 24px' }}>
                                Exit
                            </button>
                            {isHostDirect && (
                                <button className="btn-primary" onClick={() => setIsWaiting(false)} style={{ padding: '12px 32px' }}>
                                    Join Now
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="room-container">
            {/* Reaction Overlay */}
            <div className="reaction-overlay" style={{ position: 'fixed', bottom: '100px', left: '20px', pointerEvents: 'none', zIndex: 1000, display: 'flex', flexDirection: 'column-reverse', gap: '8px' }}>
                <AnimatePresence>
                    {reactions.map(r => (
                        <motion.div
                            key={r.id}
                            initial={{ y: 50, opacity: 0, scale: 0.5 }}
                            animate={{ y: -200, opacity: 1, scale: 1.5 }}
                            exit={{ opacity: 0 }}
                            style={{ fontSize: '3rem' }}
                        >
                            {r.emoji}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Captions Display */}
            {captionsActive && captionText && (
                <div className="captions-panel" style={{ position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '12px 24px', borderRadius: '8px', maxWidth: '80%', textAlign: 'center', zIndex: 1000 }}>
                    <p style={{ margin: 0, fontSize: '1.1rem' }}>{captionText}</p>
                </div>
            )}

            {/* Waiting Lobby UI */}
            {inLobby && (
                <div className="lobby-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div className="glass-card lobby-card" style={{ padding: '48px', textAlign: 'center', maxWidth: '400px', background: 'white', borderRadius: '12px' }}>
                        <Loader2 className="animate-spin" size={48} color="var(--primary)" style={{ margin: '0 auto 24px', display: 'block' }} />
                        <h2>Waiting for permission...</h2>
                        <p style={{ margin: '16px 0 32px', color: '#666' }}>The meeting host will let you in soon.</p>
                        <button className="btn-secondary" onClick={() => navigate('/')}>Leave Meeting</button>
                    </div>
                </div>
            )}

            {/* Admin Lobby Requests Overlay */}
            {isRoomAdmin && lobbyRequests.length > 0 && (
                <div className="admin-lobby-panel glass-card shadow-premium" style={{ position: 'fixed', top: '80px', right: '20px', width: '320px', zIndex: 1001, padding: '20px', background: 'white', border: '2px solid var(--primary)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={18}/> Lobby ({lobbyRequests.length})
                        </h4>
                        <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => {
                            lobbyRequests.forEach(r => socketRef.current.emit('approve-admission', r.sid));
                            setLobbyRequests([]);
                        }}>Admit All</button>
                    </div>
                    <div className="lobby-scroll" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {lobbyRequests.map(req => (
                            <div key={req.sid} className="lobby-req-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', marginBottom: '8px' }}>
                                <img src={req.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.sid}`} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{req.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Wants to join</div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button className="icon-btn-glass" style={{ color: 'var(--meet-success)', padding: '6px' }} onClick={() => {
                                        socketRef.current.emit('approve-admission', req.sid);
                                        setLobbyRequests(prev => prev.filter(r => r.sid !== req.sid));
                                    }}><Check size={16}/></button>
                                    <button className="icon-btn-glass" style={{ color: 'var(--meet-error)', padding: '6px' }} onClick={() => {
                                        socketRef.current.emit('reject-admission', req.sid);
                                        setLobbyRequests(prev => prev.filter(r => r.sid !== req.sid));
                                    }}><X size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="room-header">
                <div className="room-info" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ShieldCheck size={20} color="var(--primary)" />
                        <h3 style={{ margin: '0 12px' }}>{roomId}</h3>
                        <div className="status-dot online"></div>
                    </div>
                    
                    <nav className="header-nav" style={{ pointerEvents: 'auto', display: 'flex', gap: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '20px' }}>
                        <button className="icon-btn-glass" onClick={() => navigate('/')} title="Dashboard">
                            <Home size={18} />
                        </button>
                        <button className="icon-btn-glass" onClick={() => navigate('/schedule')} title="Schedule">
                            <Calendar size={18} />
                        </button>
                        {user?.role === 'owner' && (
                            <button className="icon-btn-glass" onClick={() => navigate('/organization')} title="Organization">
                                <Shield size={18} />
                            </button>
                        )}
                    </nav>
                </div>
                <div className="header-actions" style={{ pointerEvents: 'auto', display: 'flex', gap: '12px' }}>
                    <button className="icon-btn-glass" onClick={() => window.open('/schedule', '_blank')} title="Academic Calendar">
                        <Calendar size={20} />
                    </button>
                    <button className="icon-btn-glass" onClick={() => {
                        if (!isFullScreen) {
                            document.documentElement.requestFullscreen().catch(e => console.error(e));
                            setIsFullScreen(true);
                        } else {
                            if (document.fullscreenElement) {
                                document.exitFullscreen().catch(e => console.error(e));
                            }
                            setIsFullScreen(false);
                        }
                    }} title="Full Screen">
                        <Monitor size={20} />
                    </button>
                    <button className="icon-btn-glass" onClick={() => {
                        const link = window.location.origin + "/room/" + roomId;
                        navigator.clipboard.writeText(link);
                        alert("Link copied: " + link);
                    }} title="Invite">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            <main className="room-main">
                {whiteboardActive ? (
                    <div className="whiteboard-container" style={{ background: '#f8f9fa' }}>
                         <Whiteboard socket={socketRef.current} roomId={roomId} />
                         <div className="pip-container" style={{ borderRadius: '12px', border: '3px solid var(--primary)', overflow: 'hidden' }}>
                             <video ref={setLocalVideoTarget} autoPlay muted playsInline 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                                    className={`${cameraMode} ${adminBlockedFilters && (cameraMode !== 'original' && cameraMode !== 'mirror') ? 'original' : ''}`} />
                         </div>
                    </div>
                ) : (
                    <div className="video-grid" data-count={Object.keys(remoteStreams).length + 1}>
                        <div className={`video-card ${isHandRaised ? 'hand-raised' : ''}`}>
                            <video ref={setLocalVideoTarget} autoPlay muted playsInline 
                                   style={{display: videoOn ? 'block' : 'none'}}
                                   className={`${cameraMode} ${adminBlockedFilters && (cameraMode !== 'original' && cameraMode !== 'mirror') ? 'original' : ''}`} />
                            {!videoOn && (
                                <div className="avatar-placeholder">
                                    <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} alt="Me" />
                                </div>
                            )}
                            <div className="video-label">
                                {isHandRaised && <span className="hand-icon">✋</span>}
                                You {!micOn && <MicOff size={14} color="#ea4335" />}
                            </div>
                        </div>

                        {Object.values(remoteStreams).map(peer => (
                            <div key={peer.id} className={`video-card ${peer.isHandRaised ? 'hand-raised' : ''}`}>
                                {peer.videoStatus !== 'off' ? (
                                    <VideoElement stream={peer.stream} />
                                ) : (
                                    <div className="avatar-placeholder">
                                        <img src={peer.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.id}`} alt={peer.name} />
                                    </div>
                                )}
                                <div className="video-label">
                                    {peer.isHandRaised && <span className="hand-icon">✋</span>}
                                    {peer.name} {peer.micStatus === 'off' && <MicOff size={14} color="#ea4335" />}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <AnimatePresence>
                    {showParticipants && (
                        <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="chat-panel glass-card shadow-premium">
                            <div className="chat-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px 24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <h3 style={{ margin: 0 }}>People ({Object.keys(remoteStreams).length + 1})</h3>
                                    <button onClick={() => setShowParticipants(false)}><X size={20}/></button>
                                </div>
                                {isRoomAdmin && (
                                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                        <button className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }} 
                                                onClick={() => {
                                                    const newState = !isRestrictedMode;
                                                    setIsRestrictedMode(newState);
                                                    socketRef.current.emit('update-settings', { restricted: newState });
                                                }}>
                                            {isRestrictedMode ? 'Unlock Room' : 'Lock Room'}
                                        </button>
                                        {lobbyRequests.length > 0 && (
                                            <button className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}
                                                    onClick={() => {
                                                        lobbyRequests.forEach(r => socketRef.current.emit('approve-admission', r.sid));
                                                        setLobbyRequests([]);
                                                    }}>Admit All</button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="participants-list" style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
                                <div className={`participant-item ${isSpeakingRef.current ? 'is-speaking' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(26,115,232,0.1)', marginBottom: '8px' }}>
                                    <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            You {isRoomAdmin && <span className="participant-badge badge-admin">Admin</span>}
                                        </div>
                                    </div>
                                    {isSharingScreen && <span className="participant-badge badge-sharing"><Monitor size={10}/></span>}
                                    <div className="status-dot online"></div>
                                </div>
                                {Object.values(remoteStreams).map(peer => (
                                    <div key={peer.id} className={`participant-item ${peer.isSpeaking ? 'is-speaking' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                                        <img src={peer.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.id}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {peer.name} 
                                                {coAdmins.includes(peer.id) && <span className="participant-badge badge-coadmin">Co-Admin</span>}
                                            </div>
                                        </div>
                                        {peer.isSharing && <span className="participant-badge badge-sharing"><Monitor size={10}/></span>}
                                        
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {(isRoomAdmin || coAdmins.includes(socketRef.current.id)) && (
                                                <>
                                                    <button onClick={() => socketRef.current.emit('restrict-user', peer.id, 'mute')} title="Mute Student" style={{ color: '#ea4335', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                        <MicOff size={14} />
                                                    </button>
                                                    {isRoomAdmin && (
                                                        <>
                                                            <button onClick={() => socketRef.current.emit('promote-coadmin', peer.id)} title="Make Co-Admin" style={{ color: '#fbbc04', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                                <ShieldCheck size={14} />
                                                            </button>
                                                            <button onClick={() => socketRef.current.emit('ban-user', peer.id)} title="Kick Student" style={{ color: '#ea4335', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                                <UserMinus size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className={`status-dot ${peer.videoStatus === 'off' ? 'offline' : 'online'}`}></div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {showChat && (
                        <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="chat-panel glass-card">
                            <div className="chat-header">
                                <h3>Meeting Chat</h3>
                                <button onClick={() => setShowChat(false)}><X size={20}/></button>
                            </div>
                            <div className="chat-messages" style={{ padding: '12px' }}>
                                {messages.map((m, i) => (
                                    <div key={i} className={`msg ${m.sender === myNameRef.current ? 'own' : ''} ${m.isPrivate ? 'private' : ''}`}
                                         style={{ marginBottom: '10px' }}>
                                        <span className="sender" style={{ fontSize: '0.7rem', color: m.isPrivate ? '#fabb05' : 'var(--primary)' }}>
                                            {m.sender} {m.isPrivate ? '(Private)' : ''}
                                        </span>
                                        <p style={{ background: m.isPrivate ? '#fff8e1' : undefined }}>{m.text}</p>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            
                            {isRoomAdmin && (
                                <div className="admin-chat-controls" style={{ padding: '0 12px 8px', display: 'flex', gap: '8px' }}>
                                    <select value={chatType} onChange={(e) => setChatType(e.target.value)}
                                            style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                        <option value="public">Everyone</option>
                                        <option value="private">Private...</option>
                                    </select>
                                    {chatType === 'private' && (
                                        <select value={privateTarget?.id || ''} 
                                                onChange={(e) => {
                                                    const p = Object.values(remoteStreams).find(p => p.id === e.target.value);
                                                    setPrivateTarget(p);
                                                }}
                                                style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                            <option value="">Select Student</option>
                                            {Object.values(remoteStreams).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    )}
                                </div>
                            )}

                            {!chatBlocked || isRoomAdmin ? (
                                <div className="chat-input-area">
                                    <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="Send message..." />
                                    <button onClick={sendMessage}><Send size={18} /></button>
                                </div>
                            ) : (
                                <div className="chat-input-area blocked">Chat is disabled by host</div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <div className="room-controls">
                <div className="controls-center" style={{ gap: '16px' }}>
                    <button className={`control-btn ${!micOn ? 'off' : ''}`} onClick={toggleMic}>
                        {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>
                    
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <button className={`control-btn ${!videoOn ? 'off' : ''}`} onClick={toggleVideo} style={{ borderRadius: '50% 0 0 50%' }}>
                            {videoOn ? <Video size={24} /> : <VideoOff size={24} />}
                        </button>
                        <button className="control-btn" onClick={() => setShowCameraOptions(!showCameraOptions)} 
                                style={{ width: '30px', borderRadius: '0 50% 50% 0', marginLeft: '-1px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                            <ChevronDown size={14} />
                        </button>
                        
                        <AnimatePresence>
                            {showCameraOptions && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                            className="glass-card camera-options-menu" style={{ position: 'absolute', bottom: '70px', left: 0, width: '220px', padding: '8px', zIndex: 1000 }}>
                                    {[
                                        { id: 'original', label: 'Original Performance', icon: <Sparkles size={16}/> },
                                        { id: 'blur', label: 'Professional Blur', icon: <XCircle size={16}/> },
                                        { id: 'brighten', label: 'Auto-Brightness', icon: <WifiOff size={16}/> },
                                        { id: 'mirror', label: 'Mirror Identity', icon: <Monitor size={16}/> }
                                    ].map(opt => (
                                        <button key={opt.id} onClick={() => { setCameraMode(opt.id); setShowCameraOptions(false); }}
                                                className={`menu-item ${cameraMode === opt.id ? 'active' : ''}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '8px' }}>
                                            {opt.icon} {opt.label}
                                        </button>
                                    ))}
                                    {isRoomAdmin && (
                                        <>
                                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                                            <button onClick={() => {
                                                const newState = !adminBlockedFilters;
                                                setAdminBlockedFilters(newState);
                                                socketRef.current.emit('update-settings', { blockFilters: newState });
                                            }}
                                            style={{ color: '#ea4335', fontSize: '0.8rem', width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                {adminBlockedFilters ? 'Allow Student Filters' : 'Block Student Filters'}
                                            </button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button className={`control-btn ${isSharingScreen ? 'active' : ''}`} onClick={isSharingScreen ? stopScreenShare : startScreenShare} title="Share Screen">
                        <Monitor size={24} />
                    </button>

                    <div className="reaction-trigger">
                        <button className="control-btn"><Sparkles size={22} /></button>
                        <div className="reaction-picker">
                            {['👏', '❤️', '😂', '😮', '🔥'].map(e => (
                                <button key={e} onClick={() => socketRef.current.emit('reaction', e)}>{e}</button>
                            ))}
                        </div>
                    </div>

                    <button className={`control-btn ${isHandRaised ? 'active' : ''}`} onClick={() => {
                        const s = !isHandRaised; setIsHandRaised(s);
                        socketRef.current.emit('raise-hand', s);
                    }}><span style={{fontSize: '1.4rem'}}>✋</span></button>

                    <button className={`control-btn ${captionsActive ? 'active' : ''}`} onClick={() => setCaptionsActive(!captionsActive)}>
                        <FileText size={22} />
                    </button>

                    <button className="control-btn end-btn" onClick={() => navigate('/')}><PhoneOff size={22} /></button>
                </div>
                
                <div className="controls-right">
                    <button className={`control-btn ${showParticipants ? 'active' : ''}`} onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }} title="Participants">
                        <Users size={22} />
                    </button>
                    <button className={`control-btn ${showChat ? 'active' : ''}`} onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}>
                        <MessageSquare size={22} />
                    </button>
                    {isRoomAdmin && (
                        <button className="control-btn" onClick={() => socketRef.current.emit('mute-all')} title="Mute All">
                             <MicOff size={22} color="#ea4335" />
                        </button>
                    )}
                </div>
            </div>

            {showSettings && (
                <div className="modal-overlay">
                    <div className="glass-card settings-modal" style={{ width: '400px', background: 'white', padding: '24px' }}>
                         <h3>Meeting Settings</h3>
                         <div className="setting-row">
                             <label>Microphone</label>
                             <select>{availableDevices.mics.map(d => <option key={d.deviceId}>{d.label}</option>)}</select>
                         </div>
                         <div className="setting-row">
                             <label>Video Camera</label>
                             <select>{availableDevices.videos.map(d => <option key={d.deviceId}>{d.label}</option>)}</select>
                         </div>
                         <button className="btn-primary" onClick={() => setShowSettings(false)} style={{ marginTop: '20px', width: '100%' }}>Done</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const VideoElement = ({ stream }) => {
    const ref = useRef();
    useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
    return <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
};

export default Room;
