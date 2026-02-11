import clsx from "clsx";

interface AvatarProps {
    emotion: string; // "neutral", "happy", "sad", "concerned", "angry"
    isSpeaking: boolean;
    audioVolume: number; // 0 to 1
}

export default function Avatar({ emotion, isSpeaking, audioVolume }: AvatarProps) {
    // Determine which image to show
    // We assume images are in /public/assets/
    // Since generation failed, we might use placeholders or just <img> tags pointing to where they SHOULD be.
    // Ideally, we'd have: /assets/ava_neutral.png and /assets/ava_speaking.png

    // Simple logic: if speaking and volume is high enough, show speaking frame.
    const isMouthOpen = isSpeaking && audioVolume > 0.05;
    const imageSrc = isMouthOpen ? "/assets/ava_speaking.png" : "/assets/ava_neutral.png";

    // Glow effects based on emotion
    const getGlow = () => {
        switch (emotion) {
            case "happy": return "shadow-[0_0_60px_-10px_rgba(253,224,71,0.3)]";
            case "sad": return "shadow-[0_0_60px_-10px_rgba(59,130,246,0.3)]";
            case "angry": return "shadow-[0_0_60px_-10px_rgba(239,68,68,0.3)]";
            case "concerned": return "shadow-[0_0_60px_-10px_rgba(168,85,247,0.3)]";
            default: return "shadow-[0_0_60px_-10px_rgba(20,184,166,0.2)]";
        }
    };

    return (
        <div className={clsx(
            "relative w-72 h-72 rounded-full transition-all duration-500 flex items-center justify-center",
            getGlow()
        )}>
            {/* 
               If images are missing, this might show broken image icon. 
               We'll add a fallback strictly for dev purposes if needed, but <img> is standard.
            */}
            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-white/10 relative z-10 bg-gray-900">
                <img
                    src={imageSrc}
                    alt="Virtual Assistant"
                    className={clsx(
                        "w-full h-full object-cover transition-transform duration-100",
                        isMouthOpen ? "scale-105" : "scale-100"
                    )}
                    onError={(e) => {
                        // Fallback purely for demonstration if images fail to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.classList.add('bg-gradient-to-br', 'from-teal-500', 'to-blue-600');
                    }}
                />

                {/* Fallback Text if image is broken/hidden */}
                <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs font-mono pointer-events-none">
                    AVA
                </div>
            </div>

            {/* Subtle Pulse Animation Ring */}
            <div className={clsx(
                "absolute inset-0 rounded-full border border-white/5 animate-ping",
                isSpeaking ? "opacity-30" : "opacity-0"
            )} />
        </div>
    );
}
