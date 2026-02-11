import { useEffect, useRef, useState } from "react";

export function useAudioVisualizer(stream: MediaStream | null) {
    const [volume, setVolume] = useState(0);
    const animationRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    useEffect(() => {
        if (!stream) {
            setVolume(0);
            return;
        }

        const initContext = async () => {
            // Create context only if needed
            if (!audioContextRef.current || audioContextRef.current.state === "closed") {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const ctx = audioContextRef.current;

            // Resume if suspended
            if (ctx.state === "suspended") {
                await ctx.resume().catch(e => console.warn("Audio resume failed", e));
            }

            analyserRef.current = ctx.createAnalyser();
            analyserRef.current.fftSize = 32;

            try {
                sourceRef.current = ctx.createMediaStreamSource(stream);
                sourceRef.current.connect(analyserRef.current);
            } catch (err) {
                console.warn("Stream source creation failed", err);
                return;
            }

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

            const update = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setVolume(Math.min(1, avg / 128));

                animationRef.current = requestAnimationFrame(update);
            };

            update();
        };

        initContext();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            sourceRef.current?.disconnect();
            // Important: Close context to prevent hitting browser limit (max 6 contexts)
            audioContextRef.current?.close().catch(e => console.warn("Context close failed", e));
            audioContextRef.current = null;
        };
    }, [stream]);

    return volume;
}
