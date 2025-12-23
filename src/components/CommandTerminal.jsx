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
    const boxRefs = useRef({});

    // Load from local storage or use default
    const [pillars, setPillars] = useState(() => {
        const saved = localStorage.getItem('command-terminal-nodes');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.map(p => ({
                ...p,
                icon: p.isCustom ? Brain : DEFAULT_PILLARS.find(d => d.id === p.id)?.icon || Brain
            }));
        }
        return DEFAULT_PILLARS;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Search / Command State
    const [inputText, setInputText] = useState('');
    const [searchMode, setSearchMode] = useState('NAVIGATE'); // 'NAVIGATE' | 'SEARCH'

    // Save to local storage
    useEffect(() => {
        const toSave = pillars.map(p => ({
            ...p,
            icon: undefined
        }));
        localStorage.setItem('command-terminal-nodes', JSON.stringify(toSave));
    }, [pillars]);

    const handleAddNode = (newNode) => {
        const id = `custom-${Date.now()}`;
        const node = { ...newNode, id, isCustom: true };
        setPillars(prev => [...prev, node]);
    };

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
        setTimeout(() => window.open(pillar.url, '_blank'), 300);
    };

    const handleCommandSubmit = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        if (searchMode === 'NAVIGATE') {
            // Find matched pillar
            const match = pillars.find(p => p.label.toLowerCase().includes(inputText.toLowerCase()) ||
                p.sub.toLowerCase().includes(inputText.toLowerCase()));
            if (match) {
                openPillar(match);
                setInputText('');
            }
        } else {
            // Search Substack
            window.open(`https://substack.com/search/${encodeURIComponent(inputText)}`, '_blank');
            setInputText('');
        }
    };

    useEffect(() => {
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

        // Bounds
        const wallThickness = 60;
        const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + wallThickness / 2 - 10, window.innerWidth, wallThickness, {
            isStatic: true,
            render: { fillStyle: '#00ff41' }
        });
        const leftWall = Bodies.rectangle(0 - wallThickness / 2, window.innerHeight / 2, wallThickness, window.innerHeight * 5, { isStatic: true });
        const rightWall = Bodies.rectangle(window.innerWidth + wallThickness / 2, window.innerHeight / 2, wallThickness, window.innerHeight * 5, { isStatic: true });

        // Roof to keep them in? No, let them fall from sky.
        World.add(engine.world, [ground, leftWall, rightWall]);

        // Add Pillar Bodies
        const bodies = pillars.map((p, i) => {
            const x = (window.innerWidth / (pillars.length + 1)) * (i + 1);
            const y = -200 - (i * 100);
            const width = 180;
            const height = 120;

            return Bodies.rectangle(x, y, width, height, {
                label: p.id,
                chamfer: { radius: 4 }, // Sharper corners for "Solid" look
                restitution: 0.5,
                friction: 0.5,
                render: { visible: false }
            });
        });

        World.add(engine.world, bodies);

        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });

        // Click Handling via Matter
        let clickStart = 0;
        Events.on(mouseConstraint, 'mousedown', (event) => {
            clickStart = Date.now();
        });
        Events.on(mouseConstraint, 'mouseup', (event) => {
            if (Date.now() - clickStart < 200) {
                const mousePosition = event.mouse.position;
                const bodies = Matter.Query.point(engine.world.bodies, mousePosition);
                if (bodies.length > 0) {
                    const body = bodies[0];
                    const pillar = pillars.find(p => p.id === body.label);
                    if (pillar) {
                        openPillar(pillar);
                    }
                }
            }
        });

        World.add(engine.world, mouseConstraint);
        Matter.Runner.run(engine);
        Render.run(render);

        const syncLoop = () => {
            bodies.forEach(body => {
                const el = boxRefs.current[body.label];
                if (el) {
                    const { x, y } = body.position;
                    const angle = body.angle;
                    el.style.transform = `translate(${x - 90}px, ${y - 60}px) rotate(${angle}rad)`;
                }
            });
        };
        Events.on(engine, 'afterUpdate', syncLoop);

        const handleResize = () => {
            render.canvas.width = window.innerWidth;
            render.canvas.height = window.innerHeight;
            Matter.Body.setPosition(ground, { x: window.innerWidth / 2, y: window.innerHeight + wallThickness / 2 - 10 });
            Matter.Body.setPosition(rightWall, { x: window.innerWidth + wallThickness / 2, y: window.innerHeight / 2 });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            Render.stop(render);
            Runner.stop(engine);
            if (engineRef.current) {
                World.clear(engineRef.current.world);
                Engine.clear(engineRef.current);
            }
            boxRefs.current = {};
        };
    }, [pillars]);

    return (
        <div ref={sceneRef} className="absolute inset-0 bg-transparent z-10 overflow-hidden">
            {pillars.map((p) => (
                <div
                    key={p.id}
                    ref={el => boxRefs.current[p.id] = el}
                    className="absolute top-0 left-0 w-[180px] h-[120px] rounded-lg
                             flex flex-col items-center justify-center p-4
                             shadow-[0_0_20px_rgba(0,0,0,0.8)] select-none pointer-events-none will-change-transform
                             transition-colors duration-200"
                    style={{
                        backgroundColor: '#000000', // Solid Black
                        border: `2px solid ${p.color}`, // High contrast border
                        // If navigating and text matches, highlight
                        borderColor: (searchMode === 'NAVIGATE' && inputText && (p.label.toLowerCase().includes(inputText.toLowerCase()) || p.sub.toLowerCase().includes(inputText.toLowerCase())))
                            ? '#ffffff' : p.color,
                        boxShadow: (searchMode === 'NAVIGATE' && inputText && (p.label.toLowerCase().includes(inputText.toLowerCase()) || p.sub.toLowerCase().includes(inputText.toLowerCase())))
                            ? `0 0 30px ${p.color}` : `0 0 10px ${p.color}44`
                    }}
                >
                    <p.icon size={28} style={{ color: p.color }} className="mb-2 drop-shadow-md" />
                    <h3 className="text-white font-black text-base tracking-wider text-center leading-tight drop-shadow-sm">{p.label}</h3>
                    <p className="text-xs text-gray-400 mt-1 truncate max-w-full font-bold">{p.sub}</p>
                </div>
            ))}

            {/* Command Bar Area */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 flex flex-col space-y-3">

                {/* Toggle Switch */}
                <div className="flex justify-center space-x-1 bg-black/80 backdrop-blur border border-gray-800 rounded-full p-1 w-max mx-auto">
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

                {/* Input Bar */}
                <form onSubmit={handleCommandSubmit} className="relative w-full group">
                    <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 opacity-20 pointer-events-none
                                   ${searchMode === 'SEARCH' ? 'bg-terminal-green blur-md' : 'bg-white blur-md'}`}></div>

                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={searchMode === 'NAVIGATE' ? "TYPE TO NAVIGATE (E.G. 'STRATEGY')..." : "SEARCH SUBSTACK / WEB..."}
                        className="w-full bg-black/90 text-white font-mono text-sm p-4 pr-12 rounded-xl border border-gray-700 
                                 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/50 transition-all shadow-2xl"
                    />

                    <button
                        type="button"
                        onClick={startListening}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors
                                  ${isListening ? 'text-terminal-green animate-pulse' : 'text-gray-500 hover:text-white'}`}
                    >
                        {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                </form>

                {lastTranscript && (
                    <div className="text-center">
                        <span className="text-[10px] text-gray-500 font-mono bg-black/50 px-2 py-1 rounded">HEARD: "{lastTranscript}"</span>
                    </div>
                )}
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="absolute top-4 right-4 z-30 flex items-center space-x-1 text-gray-500 hover:text-terminal-green transition-colors bg-black/30 p-2 rounded border border-transparent hover:border-terminal-green/30"
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
