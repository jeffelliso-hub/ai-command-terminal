import { useState, useEffect, useCallback } from 'react';

export const useVoiceControl = (commands) => {
    const [isListening, setIsListening] = useState(false);
    const [lastTranscript, setLastTranscript] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('Browser does not support Speech Recognition');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            setLastTranscript(transcript);

            console.log("Heard:", transcript);

            // Simple keyword matching
            for (const [key, action] of Object.entries(commands)) {
                if (transcript.includes(key.toLowerCase())) {
                    action();
                    break;
                }
            }
        };

        // Expose start function
        window.startVoice = () => recognition.start();

        return () => {
            recognition.abort();
        };
    }, [commands]);

    const startListening = useCallback(() => {
        if (window.startVoice) window.startVoice();
    }, []);

    return { isListening, startListening, lastTranscript, error };
};
