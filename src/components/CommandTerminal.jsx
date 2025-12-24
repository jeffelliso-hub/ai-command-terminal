import { useEffect, useRef, useState, useMemo } from 'react';
import Matter from 'matter-js';
import { Brain, Zap, Radio, Hammer, Mic, MicOff, Plus, Search, Navigation } from 'lucide-react';
import { useVoiceControl } from '../hooks/useVoiceControl';
import AddNodeModal from './AddNodeModal';

const DEFAULT_PILLARS = [
    { id: 'strategist', label: 'THE STRATEGIST', sub: 'One Useful Thing', url: 'https://www.oneusefulthing.org/', color: '#8b5cf6', icon: Brain, keywords: ['strategist', 'useful'] },
    { id: 'tactician', label: 'THE TACTICIAN', sub: 'Superhuman', url: 'https://superhuman.ai/', color: '#ec4899', icon: Zap, keywords: ['tactician', 'superhuman'] },
    { id: 'reporter', label: 'THE REPORTER', sub: 'The Neuron', url: 'https://www.theneurondaily.com/', color: '#06b6d4', icon: Radio, keywords: ['reporter', 'neuron', 'news'] },
    { id: 'engineer', label: 'THE ENGINEER', sub: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/', color: '#f59e0b', icon: Hammer, keywords: ['engineer', 'batch', 'andrew'] },
];

const CommandTerminal = () => {
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const boxRefs = useRef({});
    const inputRef = useRef(null);
    const runnerRef = useRef(null);
    const lastTapTime = useRef({});  // Track last tap time for each pillar

    // Load from local storage or use default
    const [pillars, setPillars] = useState(() => {
        const saved = localStorage.getItem('command-terminal-nodes');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length >= 1) {
                    return parsed.map(p => ({
                        ...p,
                        icon: p.isCustom ? Brain : DEFAULT_PILLARS.find(d => d.id === p.id)?.icon || Brain
                    }));
                }
            } catch (e) {
                console.error("Local storage error", e);
            }
        }
        return DEFAULT_PILLARS;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Search / Command State
    const [inputText, setInputText] = useState('');
    const [searchMode, setSearchMode] = useState('NAVIGATE'); // 'NAVIGATE' | 'SEARCH'

    // Focus input when mode changes
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [searchMode]);

    // Save to local storage
    useEffect(() => {
        const toSave = pillars.map(p => ({
            ...p,
            icon: undefined
        }));
        localStorage.setItem('command-terminal-nodes', JSON.stringify(toSave));
    }, [pillars]);

    // Force 4 pillars if state gets weird check
    useEffect(() => {
        if (pillars.length === 0) {
            setPillars(DEFAULT_PILLARS);
        }
    }, [pillars]);

    const handleAddNode = (newNode) => {
        const id = `custom-${Date.now()}`;
        const node = { ...newNode, id, isCustom: true };
        setPillars(prev => [...prev, node]);
    };

    // Emergency Reset Trigger
    useEffect(() => {
        if (inputText === '/reset') {
            localStorage.removeItem('command-terminal-nodes');
            setPillars(DEFAULT_PILLARS);
            setInputText('');
            // Force reload
            window.location.reload();
        }
    }, [inputText]);

    // Voice Control
    const commands = useMemo(() => {
        const cmds = {};
        pillars.forEach(p => {
            const keywords = p.keywords || [p.label.toLowerCase()];
            keywords.forEach(k => {
                cmds[k] = () => openPillar(p);
            });
        });
        return cmds;
    }, [pillars]);

    const { isListening, startListening, lastTranscript } = useVoiceControl(commands);

    const openPillar = (pillar) => {
        const body = engineRef.current?.world.bodies.find(b => b.label === pillar.id);
        if (body) {
            Matter.Body.applyForce(body, body.position, { x: 0, y: -0.05 });
            Matter.Body.setAngularVelocity(body, 0.1);
        }
        setTimeout(() => window.open(pillar.url, '_blank'), 150);
    };

    const handleDoubleTap = (pillar) => {
        const now = Date.now();
        const lastTap = lastTapTime.current[pillar.id] || 0;
        const timeSinceLastTap = now - lastTap;

        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
            // Double tap detected
            openPillar(pillar);
            lastTapTime.current[pillar.id] = 0; // Reset
        } else {
            // Single tap - just update the timestamp
            lastTapTime.current[pillar.id] = now;
        }
    };

    const handleCommandSubmit = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        if (searchMode === 'NAVIGATE') {
            const match = pillars.find(p => p.label.toLowerCase().includes(inputText.toLowerCase()) ||
                p.sub.toLowerCase().includes(inputText.toLowerCase()));
            if (match) {
                openPillar(match);
                setInputText('');
            }
        } else {
            window.open(`https://substack.com/search/${encodeURIComponent(inputText)}`, '_blank');
            setInputText('');
        }
    };

    useEffect(() => {
        if (!sceneRef.current) return;

        // Cleanup previous instance if exists (React StrictMode fix)
        if (engineRef.current) {
            Matter.World.clear(engineRef.current.world);
            Matter.Engine.clear(engineRef.current);
        }
        if (renderRef.current) {
            Matter.Render.stop(renderRef.current);
            renderRef.current.canvas.remove();
        }
        if (runnerRef.current) {
            Matter.Runner.stop(runnerRef.current);
        }

        const Engine = Matter.Engine,
            Render = Matter.Render,
            World = Matter.World,
            Bodies = Matter.Bodies,
            Runner = Matter.Runner,
            Mouse = Matter.Mouse,
            MouseConstraint = Matter.MouseConstraint,
            Events = Matter.Events;

        const engine = Engine.create();
        engineRef.current = engine;

        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                background: 'transparent',
                wireframes: false,
                pixelRatio: window.devicePixelRatio
            }
        });
        renderRef.current = render;

        // Viewport
        const height = window.innerHeight;
        const width = window.innerWidth;

        // Bounds
        const wallThickness = 100;
        // RAISED GROUND: Position it 180px from bottom so blocks sit ABOVE the search bar
        const groundY = height - 180;
        const ground = Bodies.rectangle(width / 2, groundY + wallThickness / 2, width, wallThickness, {
            isStatic: true,
            render: { fillStyle: '#00ff41' }
        });
        const leftWall = Bodies.rectangle(0 - wallThickness / 2, height / 2, wallThickness, height * 5, { isStatic: true });
        const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 5, { isStatic: true });

        World.add(engine.world, [ground, leftWall, rightWall]);

        // Add Pillar Bodies
        const bodies = pillars.map((p, i) => {
            const x = (width / (pillars.length + 1)) * (i + 1);
            const y = -100 - (i * 200);
            const boxWidth = 140;  // Reduced from 180 for mobile
            const boxHeight = 100; // Reduced from 120 for mobile

            return Bodies.rectangle(x, y, boxWidth, boxHeight, {
                label: p.id,
                chamfer: { radius: 4 },
                restitution: 0.5,
                friction: 0.5,
                density: 0.001,
                render: { visible: false }
            });
        });

        if (bodies.length > 0) {
            World.add(engine.world, bodies);
        }

        const mouse = Mouse.create(render.canvas);
        mouse.pixelRatio = window.devicePixelRatio; // Fix for touch on high DPI screens

        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });

        World.add(engine.world, mouseConstraint);

        const runner = Runner.create();
        runnerRef.current = runner;
        Runner.run(runner, engine);
        Render.run(render);

        const syncLoop = () => {
            bodies.forEach(body => {
                const el = boxRefs.current[body.label];
                if (el) {
                    const { x, y } = body.position;
                    const angle = body.angle;
                    if (x !== undefined && y !== undefined) {
                        el.style.transform = `translate(${x - 70}px, ${y - 50}px) rotate(${angle}rad)`;
                        el.style.opacity = 1;
                    }
                }
            });
        };
        Events.on(engine, 'afterUpdate', syncLoop);

        const handleResize = () => {
            render.canvas.width = window.innerWidth;
            render.canvas.height = window.innerHeight;
            Matter.Body.setPosition(ground, {
                x: window.innerWidth / 2,
                y: window.innerHeight - 180 + wallThickness / 2
            });
            Matter.Body.setPosition(rightWall, {
                x: window.innerWidth + wallThickness / 2,
                y: window.innerHeight / 2
            });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (renderRef.current) {
                Render.stop(renderRef.current);
                renderRef.current.canvas.remove();
            }
            if (runnerRef.current) {
                Runner.stop(runnerRef.current);
            }
            if (engineRef.current) {
                World.clear(engineRef.current.world);
                Engine.clear(engineRef.current);
            }
        };
    }, [pillars]);

    return (
        <div className="relative w-full h-[100dvh] bg-transparent overflow-hidden">
            <div ref={sceneRef} className="absolute inset-0 z-0" />

            <div className="absolute inset-0 z-10 pointer-events-none">
                {pillars.map((p) => (
                    <div
                        key={p.id}
                        ref={el => boxRefs.current[p.id] = el}
                        onClick={() => handleDoubleTap(p)}
                        onTouchEnd={() => handleDoubleTap(p)}
                        className="absolute top-0 left-0 w-[140px] h-[100px] rounded-lg
                                 flex flex-col items-center justify-center p-3
                                 shadow-[0_0_20px_rgba(0,0,0,0.8)] select-none will-change-transform
                                 transition-colors duration-200 cursor-pointer pointer-events-none opacity-0"
                        style={{
                            backgroundColor: '#000000',
                            border: `2px solid ${p.color}`,
                            borderColor: (searchMode === 'NAVIGATE' && inputText && (p.label.toLowerCase().includes(inputText.toLowerCase()) || p.sub.toLowerCase().includes(inputText.toLowerCase())))
                                ? '#ffffff' : p.color,
                            boxShadow: (searchMode === 'NAVIGATE' && inputText && (p.label.toLowerCase().includes(inputText.toLowerCase()) || p.sub.toLowerCase().includes(inputText.toLowerCase())))
                                ? `0 0 30px ${p.color}` : `0 0 10px ${p.color}44`
                        }}
                    >
                        <p.icon size={24} style={{ color: p.color }} className="mb-1 drop-shadow-md" />
                        <h3 className="text-white font-black text-sm tracking-wider text-center leading-tight drop-shadow-sm">{p.label}</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-full font-bold">{p.sub}</p>
                    </div>
                ))}
            </div>

            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 flex flex-col space-y-3 pointer-events-none">
                <div className="pointer-events-auto w-full flex flex-col items-center space-y-3">
                    <div className="flex justify-center space-x-1 bg-black/80 backdrop-blur border border-gray-800 rounded-full p-1 w-max mx-auto shadow-lg">
                        <button
                            onClick={() => setSearchMode('NAVIGATE')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all flex items-center space-x-2
                                      ${searchMode === 'NAVIGATE' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Navigation size={12} />
                            <span>NAVIGATE</span>
                        </button>
                        <button
                            onClick={() => setSearchMode('SEARCH')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all flex items-center space-x-2
                                      ${searchMode === 'SEARCH' ? 'bg-terminal-green text-black shadow-[0_0_10px_rgba(0,255,65,0.4)]' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Search size={12} />
                            <span>SEARCH</span>
                        </button>
                    </div>

                    <form onSubmit={handleCommandSubmit} className="relative w-full group shadow-2xl">
                        <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 opacity-20 pointer-events-none
                                       ${searchMode === 'SEARCH' ? 'bg-terminal-green blur-md' : 'bg-white blur-md'}`}></div>

                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={searchMode === 'NAVIGATE' ? "TYPE TO NAVIGATE..." : "SEARCH WEB..."}
                            className="w-full bg-black/95 text-white font-mono text-base p-4 pr-12 rounded-xl border border-gray-700 
                                     focus:outline-none focus:border-white focus:ring-1 focus:ring-white/50 transition-all font-bold tracking-wider"
                            style={{ fontSize: '16px' }}
                        />

                        <button
                            type="button"
                            onClick={startListening}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors
                                      ${isListening ? 'text-terminal-green animate-pulse' : 'text-gray-500 hover:text-white'}`}
                        >
                            {isListening ? <Mic size={24} /> : <MicOff size={24} />}
                        </button>
                    </form>
                </div>

                {lastTranscript && (
                    <div className="text-center pointer-events-auto">
                        <span className="text-[10px] text-gray-500 font-mono bg-black/50 px-2 py-1 rounded">HEARD: "{lastTranscript}"</span>
                    </div>
                )}
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="absolute top-4 right-4 z-30 flex items-center space-x-1 text-gray-500 hover:text-terminal-green transition-colors bg-black/30 p-2 rounded border border-transparent hover:border-terminal-green/30 pointer-events-auto"
            >
                <Plus size={16} />
                <span className="text-xs font-mono tracking-widest hidden sm:inline">ADD NODE</span>
            </button>

            <AddNodeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddNode}
            />
        </div>
    );
};

export default CommandTerminal;
