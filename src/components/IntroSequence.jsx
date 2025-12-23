import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const IntroSequence = ({ onComplete }) => {
    const canvasRef = useRef(null);
    const [showDiagnostics, setShowDiagnostics] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Matrix characters
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&";
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = new Array(Math.ceil(columns)).fill(1);

        const draw = () => {
            // Semi-transparent black to create trail effect
            ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#0F0'; // Terminal green
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 33);

        // Sequence timing
        const diagnosticTimer = setTimeout(() => setShowDiagnostics(true), 1500);
        const completeTimer = setTimeout(() => {
            clearInterval(interval);
            onComplete();
        }, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(diagnosticTimer);
            clearTimeout(completeTimer);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-50 bg-matte-black text-terminal-green font-mono overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 opacity-40" />

            <AnimatePresence>
                {showDiagnostics && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 space-y-4 pointer-events-none"
                    >
                        <div className="border border-terminal-green p-6 bg-black/80 backdrop-blur-sm max-w-md w-full">
                            <h2 className="text-xl mb-4 border-b border-terminal-green pb-2">SYSTEM DIAGNOSTICS</h2>
                            <ul className="space-y-2 text-sm">
                                <TypewriterLine text="> INITIALIZING CORE SYSTEMS..." delay={0} />
                                <TypewriterLine text="> ESTABLISHING BIOMETRIC LINK..." delay={1000} />
                                <TypewriterLine text="> LOADING KNOWLEDGE MODULES..." delay={2000} />
                                <TypewriterLine text="> SYSTEM READY." delay={3000} />
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TypewriterLine = ({ text, delay }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        const startTimeout = setTimeout(() => {
            let currentIndex = 0;
            const interval = setInterval(() => {
                if (currentIndex <= text.length) {
                    setDisplayedText(text.slice(0, currentIndex));
                    currentIndex++;
                } else {
                    clearInterval(interval);
                }
            }, 30);

            return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(startTimeout);
    }, [text, delay]);

    return <li className="h-5">{displayedText}</li>;
};

export default IntroSequence;
