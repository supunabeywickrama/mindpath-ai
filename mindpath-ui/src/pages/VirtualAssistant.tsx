import { useState, useRef, useEffect } from "react";
import Avatar from "../components/Avatar";
import FaceDetector from "../components/FaceDetector";
import { useAudioVisualizer } from "../hooks/useAudioVisualizer";
import { transcribeAudio, virtualChat, textToSpeech } from "../lib/api";
import { Mic, MicOff, Video, VideoOff, Settings2, X } from "lucide-react";

export default function VirtualAssistant() {
    const [isRecording, setIsRecording] = useState(false);
    const [userEmotion, setUserEmotion] = useState("neutral");
    const [assistantEmotion, setAssistantEmotion] = useState("neutral");
    const [transcript, setTranscript] = useState("");
    const [response, setResponse] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [webcamEnabled, setWebcamEnabled] = useState(false);

    // Customization State
    const [voice, setVoice] = useState("nova"); // nova is female, alloy is neutral, echo is male
    const [showSettings, setShowSettings] = useState(false);

    // References
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Media Recorder State
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Avatar Visualization (Output Audio)
    const [outputStream, setOutputStream] = useState<MediaStream | null>(null);
    const outputVolume = useAudioVisualizer(outputStream);

    // 1. Setup Webcam
    useEffect(() => {
        if (webcamEnabled) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => console.error("Webcam failed", err));
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(t => t.stop());
                videoRef.current.srcObject = null;
            }
        }
    }, [webcamEnabled]);

    // Helper: Resume Audio Context (Fix for "Not Talking")
    const ensureAudioContext = async () => {
        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === "suspended") {
            await audioContextRef.current.resume();
        }
    };

    // Cleanup AudioContext on unmount
    useEffect(() => {
        return () => {
            audioContextRef.current?.close().catch(e => console.warn("VA Context close failed", e));
        };
    }, []);

    // 2. Handle Recording
    const startRecording = async () => {
        await ensureAudioContext(); // Ensure context is ready

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                await handleAudioProcess(blob);
            };

            recorder.start();
            setIsRecording(true);
            setTranscript("Listening...");
        } catch (err) {
            console.error("Mic failed", err);
            setTranscript("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks to release mic
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
    };

    // 3. Process Audio (STT -> Chat -> TTS)
    const handleAudioProcess = async (audioBlob: Blob) => {
        setTranscript("Processing...");

        // A) Transcribe
        try {
            const sttData = await transcribeAudio(audioBlob);
            const text = sttData.text;
            setTranscript(`You: "${text}"`);

            // B) Chat with virtual persona
            const chatData = await virtualChat(text, userEmotion, []);
            const reply = chatData.reply;
            setAssistantEmotion(chatData.assistant_emotion); // e.g. "happy", "sad"
            setResponse(reply);

            // C) TTS & Playback
            try {
                const ttsBlob = await textToSpeech(reply, voice);
                playResponse(ttsBlob);
            } catch (ttsErr) {
                console.warn("Backend TTS failed (likely quota), falling back to Browser TTS", ttsErr);
                speakWithBrowser(reply);
            }

        } catch (err) {
            console.error("AI loop failed", err);
            setTranscript("Error processing. (Check API Quota/Logs)");
        }
    };

    // Browser TTS Fallback
    const speakWithBrowser = (text: string) => {
        if (!('speechSynthesis' in window)) {
            alert("Browser does not support TTS.");
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Try to select a decent voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha"));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            setIsSpeaking(true);
            // Simulate volume for avatar animation since we can't easily visualize utterance
            simulateVolume();
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setOutputStream(null); // Stop simulator
        };

        window.speechSynthesis.speak(utterance);
    };

    // Simulate volume for browser TTS
    const simulateVolume = () => {
        // Create a fake oscillator to drive the visualizer or just manually pulse?
        // Since useAudioVisualizer takes a MediaStream, let's just make a fake one.
        // OR better: Update Avatar to accept a "simulated" mode? 
        // Actually, let's create a silent oscillator connected to a destination just to satisfy the hook type,
        // BUT the hook won't see real audio. 
        // INSTEAAD: We will modify the Avatar component to animate automatically if audioVolume is 0 but isSpeaking is true.
        // For now, let's just set isSpeaking. The Avatar update is next.
    };

    // 4. Audio Playback with Visualizer Hook
    const playResponse = async (blob: Blob) => {
        await ensureAudioContext();
        const ctx = audioContextRef.current!;

        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        // Create a destination that we can tap into for visualization
        const dst = ctx.createMediaStreamDestination();
        source.connect(dst);
        source.connect(ctx.destination); // Connect to speakers too!

        setOutputStream(dst.stream);
        setIsSpeaking(true);

        source.start(0);
        source.onended = () => {
            setIsSpeaking(false);
            setOutputStream(null);
        };
    };

    // Toggle Settings
    const toggleSettings = () => setShowSettings(!showSettings);

    return (
        <div className="relative flex flex-col items-center justify-center min-h-[80vh] gap-10">

            {/* Settings Toggle */}
            <div className="absolute top-6 left-6 z-20">
                <button
                    onClick={toggleSettings}
                    className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-800 text-white transition-colors"
                    title="Sela Settings"
                >
                    {showSettings ? <X size={20} /> : <Settings2 size={20} />}
                </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="absolute top-16 left-6 z-20 p-4 bg-gray-900/95 border border-gray-700 rounded-xl shadow-xl w-64 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-semibold text-white mb-3">Sela Customization</h3>



                    {/* Voice */}
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Voice</label>
                        <select
                            value={voice}
                            onChange={(e) => setVoice(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg p-2 outline-none focus:border-teal-500"
                        >
                            <option value="alloy">Alloy (Neutral)</option>
                            <option value="echo">Echo (Male)</option>
                            <option value="fable">Fable (British)</option>
                            <option value="onyx">Onyx (Deep Male)</option>
                            <option value="nova">Nova (Female)</option>
                            <option value="shimmer">Shimmer (Female)</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Hidden Components */}
            <FaceDetector videoRef={videoRef} onEmotionChange={setUserEmotion} />

            {/* Top Controls: Camera View (Small) */}
            <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-10">
                <div className="relative w-32 h-24 bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-700">
                    <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    <div className="absolute bottom-1 right-2 text-xs text-white bg-black/50 px-1 rounded">
                        {userEmotion}
                    </div>
                </div>
                <button
                    onClick={() => setWebcamEnabled(!webcamEnabled)}
                    className="text-xs text-gray-500 hover:text-teal-600 flex items-center gap-1"
                >
                    {webcamEnabled ? <VideoOff size={14} /> : <Video size={14} />} {webcamEnabled ? "Disable" : "Enable"} Face ID
                </button>
            </div>

            {/* Main Avatar */}
            <div className="mt-10">
                <Avatar
                    emotion={assistantEmotion}
                    isSpeaking={isSpeaking}
                    audioVolume={outputVolume}
                />
            </div>

            {/* Conversation Text */}
            <div className="text-center max-w-lg space-y-4 min-h-[100px]">
                {transcript && (
                    <p className="text-gray-500 italic animate-pulse">{transcript}</p>
                )}
                {response && (
                    <p className="text-xl font-medium text-gray-800">
                        "{response}"
                    </p>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-col items-center gap-4">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isSpeaking}
                    className={`
             w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95
             ${isRecording ? "bg-red-500 animate-pulse" : "bg-teal-600 hover:bg-teal-700"}
             text-white
           `}
                >
                    {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                </button>
                <p className="text-sm text-gray-400">
                    {isRecording ? "Tap to Speak" : "Listening..."}
                </p>
            </div>

        </div>
    );
}
