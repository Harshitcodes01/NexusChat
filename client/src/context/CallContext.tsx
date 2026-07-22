import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';

type CallState = 'idle' | 'calling' | 'receiving' | 'active';
type CallType = 'audio' | 'video';

interface CallerInfo {
  id: string;
  name: string;
  avatar: string;
}

interface CallContextType {
  callState: CallState;
  callType: CallType;
  callerInfo: CallerInfo | null;
  activeRecipientId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localAudioMuted: boolean;
  localVideoMuted: boolean;
  isMinimized: boolean;
  initiateCall: (recipientId: string, recipientName: string, recipientAvatar: string, type: CallType) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => void;
  endActiveCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  setIsMinimized: (min: boolean) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19002' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [callerInfo, setCallerInfo] = useState<CallerInfo | null>(null);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localAudioMuted, setLocalAudioMuted] = useState(false);
  const [localVideoMuted, setLocalVideoMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const incomingOfferRef = useRef<any | null>(null);

  // Clean streams and peer connection
  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setCallState('idle');
    setLocalStream(null);
    setRemoteStream(null);
    setCallerInfo(null);
    setActiveRecipientId(null);
    incomingOfferRef.current = null;
    setIsMinimized(false);
    setLocalAudioMuted(false);
    setLocalVideoMuted(false);
  };

  // Handle peer connection setup
  const setupPeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Track remote streams
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Gather ICE Candidates
    pc.onicecandidate = (event) => {
      const recipientId = activeRecipientId || callerInfo?.id;
      if (event.candidate && recipientId) {
        socket?.emit('ice-candidate', {
          to: recipientId,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  // Socket Signalling Listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming Call offer
    socket.on('incoming-call', (data: { from: string; offer: any; type: CallType; fromUser: any }) => {
      if (callState !== 'idle') {
        // Busy reply
        socket.emit('reject-call', { to: data.from });
        return;
      }
      incomingOfferRef.current = data.offer;
      setCallType(data.type);
      setCallerInfo({
        id: data.from,
        name: data.fromUser.name,
        avatar: data.fromUser.avatar,
      });
      setCallState('receiving');
    });

    // Caller receives answered connection
    socket.on('call-answered', async (data: { from: string; answer: any }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallState('active');
        } catch (err) {
          console.error('Failed to set remote answer description:', err);
          cleanupCall();
        }
      }
    });

    // ICE Candidate updates
    socket.on('ice-candidate', async (data: { from: string; candidate: any }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    // Call declined by receiver
    socket.on('call-rejected', () => {
      toast.error('Call rejected/busy');
      cleanupCall();
    });

    // Active Call ended
    socket.on('call-ended', () => {
      toast('Call ended');
      cleanupCall();
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-answered');
      socket.off('ice-candidate');
      socket.off('call-rejected');
      socket.off('call-ended');
    };
  }, [socket, callState, activeRecipientId, callerInfo]);

  // Initiate call
  const initiateCall = async (recipientId: string, recipientName: string, recipientAvatar: string, type: CallType) => {
    setActiveRecipientId(recipientId);
    setCallType(type);
    setCallerInfo({ id: recipientId, name: recipientName, avatar: recipientAvatar });
    setCallState('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);

      const pc = setupPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('call-user', {
        to: recipientId,
        offer,
        type,
        fromUser: {
          name: user?.name,
          avatar: user?.avatar,
        },
      });
    } catch (err) {
      console.error('Failed to capture audio/video devices:', err);
      toast.error('Failed to access microphone or camera.');
      cleanupCall();
    }
  };

  // Accept incoming call
  const acceptIncomingCall = async () => {
    if (!callerInfo || !incomingOfferRef.current) return;
    setCallState('active');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      setLocalStream(stream);

      const pc = setupPeerConnection(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit('answer-call', {
        to: callerInfo.id,
        answer,
      });
    } catch (err) {
      console.error('Failed to accept WebRTC incoming call:', err);
      toast.error('Microphone/Camera permission error.');
      rejectIncomingCall();
    }
  };

  // Reject call
  const rejectIncomingCall = () => {
    if (callerInfo) {
      socket?.emit('reject-call', { to: callerInfo.id });
    }
    cleanupCall();
  };

  // End active call
  const endActiveCall = () => {
    const recipientId = activeRecipientId || callerInfo?.id;
    if (recipientId) {
      socket?.emit('end-call', { to: recipientId });
    }
    cleanupCall();
  };

  // Audio mute/unmute
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setLocalAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // Video track enable/disable
  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setLocalVideoMuted(!videoTrack.enabled);
      }
    }
  };

  // Sync ref video tags
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState, isMinimized]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState, isMinimized]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        callerInfo,
        activeRecipientId,
        localStream,
        remoteStream,
        localAudioMuted,
        localVideoMuted,
        isMinimized,
        initiateCall,
        acceptIncomingCall,
        rejectIncomingCall,
        endActiveCall,
        toggleAudio,
        toggleVideo,
        setIsMinimized,
      }}
    >
      {children}

      {/* ================= GORGEOUS CALL OVERLAYS CONTAINER ================= */}
      {callState !== 'idle' && (
        <div className={`fixed z-50 transition-all duration-300 ${
          isMinimized 
            ? 'bottom-4 right-4 w-72 h-44 rounded-2xl glass-panel shadow-2xl p-2 flex flex-col justify-between overflow-hidden'
            : 'inset-0 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md'
        }`}>
          
          {/* Incoming call notify card */}
          {callState === 'receiving' && callerInfo && (
            <div className="w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-pulse">
              <img
                src={callerInfo.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${callerInfo.name}`}
                alt=""
                className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-accent shadow-lg shadow-accent/15"
              />
              <div>
                <h3 className="text-lg font-bold text-white truncate">{callerInfo.name}</h3>
                <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-medium">
                  Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={rejectIncomingCall}
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white cursor-pointer shadow-lg shadow-red-600/20"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
                <button
                  onClick={acceptIncomingCall}
                  className="w-12 h-12 rounded-full bg-accent text-zinc-950 hover:bg-accent-bright flex items-center justify-center cursor-pointer shadow-lg shadow-accent/20"
                >
                  <Phone className="w-5 h-5 text-zinc-950" />
                </button>
              </div>
            </div>
          )}

          {/* Calling outgoing invitation screen */}
          {callState === 'calling' && callerInfo && (
            <div className="w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl text-center space-y-5">
              <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-2">
                <span className="absolute inset-0 rounded-full bg-accent/10 border border-accent/20 animate-ping" />
                <img
                  src={callerInfo.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${callerInfo.name}`}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover border-2 border-accent shadow-lg shadow-accent/15 relative z-10"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white truncate">{callerInfo.name}</h3>
                <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-semibold">
                  Calling ({callType})...
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={endActiveCall}
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white cursor-pointer shadow-lg shadow-red-600/20"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Active Call dashboard layout */}
          {callState === 'active' && callerInfo && (
            isMinimized ? (
              /* Minimized Floating Corner Overlay UI */
              <div className="relative w-full h-full flex flex-col justify-between group">
                {callType === 'video' && remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center gap-3 px-3 bg-zinc-900/40 rounded-xl">
                    <img
                      src={callerInfo.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${callerInfo.name}`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{callerInfo.name}</p>
                      <p className="text-[9px] text-accent uppercase tracking-widest">Active Call</p>
                    </div>
                  </div>
                )}

                {/* Floating local stream PIP */}
                {callType === 'video' && localStream && !localVideoMuted && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute top-2 right-2 w-20 h-12 object-cover border border-zinc-800 rounded-lg shadow-md"
                  />
                )}

                <div className="relative z-10 w-full flex items-center justify-between p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 to-transparent mt-auto">
                  <button
                    onClick={() => setIsMinimized(false)}
                    className="p-1.5 hover:bg-zinc-800/80 rounded-lg text-white"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={endActiveCall}
                    className="p-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-white"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Full Screen Calling Dialog Overlay UI */
              <div className="w-full max-w-2xl h-[70vh] glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between relative">
                
                {/* Header row */}
                <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-3 bg-zinc-950/70 p-2 rounded-2xl backdrop-blur-sm border border-zinc-800/40">
                    <img
                      src={callerInfo.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${callerInfo.name}`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate leading-none">{callerInfo.name}</p>
                      <p className="text-[8px] text-accent mt-1 uppercase tracking-widest font-semibold">Secure connection</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-2.5 bg-zinc-950/70 hover:bg-zinc-950 text-neutral-400 hover:text-white rounded-xl backdrop-blur-sm border border-zinc-800/40 transition-colors cursor-pointer"
                    title="Minimize Call"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Stream Viewport */}
                <div className="flex-1 bg-zinc-950 flex items-center justify-center relative overflow-hidden">
                  {callType === 'video' && remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Audio pulsing display avatar */
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative flex items-center justify-center w-40 h-40">
                        {/* Concentric soundwaves breathing */}
                        <div className="absolute inset-0 rounded-full bg-accent/5 border border-accent/15 animate-ping animate-duration-3000" style={{ animationDuration: '3.5s' }} />
                        <div className="absolute w-32 h-32 rounded-full bg-accent/10 border border-accent/20 animate-ping animate-duration-2000" style={{ animationDuration: '2.5s' }} />
                        <div className="absolute w-28 h-28 rounded-full bg-accent/15 border border-accent/25 animate-pulse" />
                        <img
                          src={callerInfo.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${callerInfo.name}`}
                          alt=""
                          className="w-24 h-24 rounded-full object-cover border-2 border-accent shadow-2xl relative z-10"
                        />
                      </div>
                      <p className="text-xs font-bold text-accent uppercase tracking-widest text-center mt-2">Voice call active</p>
                    </div>
                  )}

                  {/* Picture-in-picture local stream camera tag */}
                  {callType === 'video' && localStream && !localVideoMuted && (
                    <div className="absolute bottom-20 right-4 w-40 h-28 border border-zinc-800 bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Control Actions Deck */}
                <div className="p-6 bg-zinc-950/80 border-t border-zinc-800/60 backdrop-blur-sm flex items-center justify-center gap-4 z-20">
                  <button
                    onClick={toggleAudio}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      localAudioMuted
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-neutral-300 hover:text-white border border-zinc-750'
                    }`}
                  >
                    {localAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={endActiveCall}
                    className="w-16 h-12 rounded-2xl bg-red-600 hover:bg-red-500 flex items-center justify-center text-white cursor-pointer shadow-lg shadow-red-600/15"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>

                  {callType === 'video' && (
                    <button
                      onClick={toggleVideo}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                        localVideoMuted
                          ? 'bg-red-600 hover:bg-red-500 text-white'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-neutral-300 hover:text-white border border-zinc-750'
                      }`}
                    >
                      {localVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                  )}
                </div>

              </div>
            )
          )}

        </div>
      )}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
