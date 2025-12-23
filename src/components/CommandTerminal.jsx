import { useEffect, useRef, useState, useMemo } from 'react';
import Matter from 'matter-js';
import { Brain, Zap, Radio, Hammer, Mic, MicOff, Plus } from 'lucide-react';
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
            // We need to re-attach icons because JSON doesn't store functions/components
            const parsed = JSON.parse(saved);
            return parsed.map(p => ({
                ...p,
                icon: p.isCustom ? Brain : DEFAULT_PILLARS.find(d => d.id === p.id)?.icon || Brain
            }));
        }
        return DEFAULT_PILLARS;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Save to local storage whenever pillars change
    useEffect(() => {
        const toSave = pillars.map(p => ({
            ...p,
            icon: undefined // Don't save icon component
        }));
        localStorage.setItem('command-terminal-nodes', JSON.stringify(toSave));
    }, [pillars]);

    const handleAddNode = (newNode) => {
        const id = `custom-${Date.now()}`;
        const node = {
            ...newNode,
            id,
            isCustom: true
        };
        setPillars(prev => [...prev, node]);
    };

    // Voice Control Setup
    const commands = useMemo(() => {
        const cmds = {};
        pillars.forEach(p => {
            const keywords = p.keywords || [p.label.toLowerCase()];
            keywords.forEach(k => {
                cmds[k] = () => {
                    const body = engineRef.current?.world.bodies.find(b => b.label === p.id);
                    if (body) {
                        Matter.Body.applyForce(body, body.position, { x: 0, y: -0.05 });
                        Matter.Body.setAngularVelocity(body, 0.1);
                        setTimeout(() => window.open(p.url, '_blank'), 800);
                    }
                };
            });
        });
        return cmds;
    }, [pillars]);

    const { isListening, startListening, lastTranscript } = useVoiceControl(commands);

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

        World.add(engine.world, [ground, leftWall, rightWall]);

        // Add Pillar Bodies
        const bodies = pillars.map((p, i) => {
            // Adaptive positioning based on count
            const x = (window.innerWidth / (pillars.length + 1)) * (i + 1);
            const y = -200 - (i * 100);
            const width = 180;
            const height = 120;

            return Bodies.rectangle(x, y, width, height, {
                label: p.id,
                chamfer: { radius: 10 },
                restitution: 0.6,
                friction: 0.5,
                render: { visible: false }
            });
        });

        World.add(engine.world, bodies);

        // Mouse Control
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });

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
                        window.open(pillar.url, '_blank');
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
            // Clear refs on cleanup
            boxRefs.current = {};
        };
    }, [pillars]);

    return (
        <div ref={sceneRef} className="absolute inset-0 bg-transparent z-10 overflow-hidden">
            {pillars.map((p) => (
                <div
                    key={p.id}
                    ref={el => boxRefs.current[p.id] = el}
                    className="absolute top-0 left-0 w-[180px] h-[120px] rounded-xl
                             backdrop-blur-md flex flex-col items-center justify-center p-4
                             shadow-[0_0_15px_rgba(0,0,0,0.5)] select-none pointer-events-none will-change-transform"
                    style={{
                        backgroundColor: `${p.color}22`,
                        borderColor: p.color,
                        boxShadow: `0 0 10px ${p.color}44`,
                        borderWidth: '1px'
                    }}
                >
                    <p.icon size={24} style={{ color: p.color }} className="mb-2" />
                    <h3 className="text-white font-bold text-sm tracking-wider text-center leading-tight">{p.label}</h3>
                    <p className="text-xs text-gray-300 mt-1 truncate max-w-full opacity-70">{p.sub}</p>
                </div>
            ))}

            <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></span>
                    <h3 className="text-terminal-green text-sm opacity-70">PHYSICS: ACTIVE</h3>
                </div>
                {lastTranscript && <p className="text-white text-xs bg-black/50 p-1 px-2 rounded border border-gray-800">"{lastTranscript}"</p>}
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="absolute top-4 right-4 z-30 flex items-center space-x-1 text-gray-500 hover:text-terminal-green transition-colors bg-black/30 p-2 rounded border border-transparent hover:border-terminal-green/30"
            >
                <Plus size={16} />
                <span className="text-xs font-mono tracking-widest hidden sm:inline">ADD NODE</span>
            </button>

            <button
                onClick={startListening}
                className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full 
                        border font-mono text-sm tracking-wider transition-all duration-300
                        flex items-center space-x-2 backdrop-blur-sm
                        ${isListening
                        ? 'bg-terminal-green/20 text-terminal-green border-terminal-green shadow-[0_0_20px_#00ff41]'
                        : 'bg-black/50 text-gray-300 border-gray-700 hover:border-terminal-green hover:text-terminal-green'}`}
            >
                {isListening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
                <span>{isListening ? 'LISTENING...' : 'ACTIVATE VOICE'}</span>
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
