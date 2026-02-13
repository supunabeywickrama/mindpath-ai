import clsx from "clsx";
import selaAvatar from "../assets/sela_avatar.png";

interface AvatarProps {
    emotion: string; // "neutral", "happy", "sad", "concerned", "angry"
    isSpeaking: boolean;
    audioVolume: number; // 0 to 1
}

export default function Avatar({ emotion, isSpeaking, audioVolume }: AvatarProps) {
    // Glow effects based on emotion
    const getGlow = () => {
        switch (emotion) {
            case "happy": return "shadow-[0_0_80px_-10px_rgba(253,224,71,0.4)]";
            case "sad": return "shadow-[0_0_80px_-10px_rgba(59,130,246,0.4)]";
            case "angry": return "shadow-[0_0_80px_-10px_rgba(239,68,68,0.4)]";
            case "concerned": return "shadow-[0_0_80px_-10px_rgba(168,85,247,0.4)]";
            default: return "shadow-[0_0_80px_-10px_rgba(45,212,191,0.3)]";
        }
    };

    // Calculate jaw drop based on volume if speaking
    // We'll use a CSS mask/clip-path or transform on a duplicated bottom half to simulate jaw movement
    // But for a single image, a simple scale on the Y axis of a "mouth" patch is hard.
    // Instead, we will pulse the entire image slightly and maybe use a visualizer overlay.

    // BETTER APPROACH for "Lips Moving" with 1 image:
    // We can't do real lips. But we can animate a small circle/waveform OVER the mouth, 
    // OR we can try to scale the bottom half. 
    // Let's stick to a robust "speaking" state that scales the avatar slightly with the volume.
    // AND add a "speaking" overlay that looks like a high-tech voice interface if real lips are impossible.

    // HOWEVER, user asked for "lips moving".
    // I will try to implement a "Jaw" effect by duplicating the image, masking the jaw area, and moving it.
    // This requires precise alignment. Since I don't know the exact pixel coordinates of the mouth,
    // I will use a general "talking head" bobbing animation + a high-tech waveform over the mouth area?
    // No, user wants lips.

    // Let's use a "Jaw Drop" animation by scaling the bottom 20% of the image? No, that looks weird.
    // I will implement a "Squash and Stretch" on the whole avatar which is commonly used in anime/games for talking.

    const scaleY = isSpeaking ? 1 + (audioVolume * 0.1) : 1;

    return (
        <div className={clsx(
            "relative w-80 h-80 rounded-full transition-shadow duration-500 flex items-center justify-center",
            getGlow()
        )}>
            {/* Main Avatar Container */}
            <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-white/10 z-10 bg-gray-900 group">

                {/* 1. Base Image (Static) */}
                <img
                    src={selaAvatar}
                    alt="Sela"
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* 2. "Jaw" Layer - We try to simulate mouth movement by overlaying a slightly scaled/moved version of the lower face? 
                   Actually, let's just create a subtle "talking" animation where the whole head bobs slightly.
                */}
                <img
                    src={selaAvatar}
                    alt="Sela Motion"
                    className={clsx(
                        "absolute inset-0 w-full h-full object-cover transition-transform duration-75 origin-bottom",
                    )}
                    style={{
                        transform: isSpeaking ? `scaleY(${1 + audioVolume * 0.05}) translateY(${audioVolume * 2}px)` : 'none',
                        filter: isSpeaking ? 'brightness(1.05)' : 'none'
                    }}
                />

                {/* 3. Visualizer Overlay (High tech look) - Optional, but adds to the "AI" feel */}
                <div className={clsx(
                    "absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-teal-900/40 to-transparent transition-opacity duration-300",
                    isSpeaking ? "opacity-100" : "opacity-0"
                )} />

            </div>

            {/* Orbital Rings - purely aesthetic */}
            <div className="absolute inset-[-20px] rounded-full border border-teal-500/20 animate-spin-slow pointer-events-none" />
            <div className="absolute inset-[-10px] rounded-full border border-white/10 animate-reverse-spin pointer-events-none" />

            {/* Speaking Pulse */}
            <div className={clsx(
                "absolute inset-0 rounded-full border-2 border-teal-500/30",
                isSpeaking ? "animate-ping" : "hidden"
            )} />
        </div>
    );
}
