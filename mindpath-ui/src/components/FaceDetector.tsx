import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface FaceDetectorProps {
    onEmotionChange: (emotion: string) => void;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function FaceDetector({ onEmotionChange, videoRef }: FaceDetectorProps) {
    const [running, setRunning] = useState(false);
    const lastEmotion = useRef("neutral");

    useEffect(() => {
        let landmarker: FaceLandmarker | null = null;
        let animationId: number;

        const setup = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );
                landmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU",
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 1,
                });
                setRunning(true);
                predict();
            } catch (err) {
                console.error("FaceDetector Setup Failed:", err);
                // Fail gracefully, don't loop
            }
        };

        const predict = () => {
            if (videoRef.current && videoRef.current.readyState >= 2 && landmarker) {
                const results = landmarker.detectForVideo(videoRef.current, performance.now());

                if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                    const shapes = results.faceBlendshapes[0].categories;

                    // Simple heuristic for basic emotions based on blendshapes
                    // Note: This is a simplification. Real emotion detection is complex.
                    const mouthSmile = shapes.find(s => s.categoryName === "mouthSmileLeft")?.score || 0;
                    const browDown = shapes.find(s => s.categoryName === "browDownLeft")?.score || 0;
                    const mouthFrown = shapes.find(s => s.categoryName === "mouthFrownLeft")?.score || 0; // approximation

                    let emo = "neutral";
                    if (mouthSmile > 0.4) emo = "happy";
                    else if (browDown > 0.5) emo = "angry";
                    else if (mouthFrown > 0.5) emo = "sad"; // often better to look at specific mouth corners

                    // Debounce slightly
                    if (emo !== lastEmotion.current) {
                        lastEmotion.current = emo;
                        onEmotionChange(emo);
                    }
                }
            }
            animationId = requestAnimationFrame(predict);
        };

        setup();

        return () => {
            setRunning(false);
            if (landmarker) landmarker.close();
            cancelAnimationFrame(animationId);
        };
    }, [onEmotionChange, videoRef]);

    return null; // Headless component, logic only
}
