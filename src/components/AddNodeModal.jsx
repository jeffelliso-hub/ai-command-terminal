import { useState } from 'react';
import { X, Plus, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AddNodeModal = ({ isOpen, onClose, onAdd }) => {
    const [label, setLabel] = useState('');
    const [sub, setSub] = useState('');
    const [url, setUrl] = useState('');
    const [color, setColor] = useState('#00ff41');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!label || !url) return;

        onAdd({
            label: label.toUpperCase(),
            sub,
            url,
            color,
            icon: Brain, // Default icon for custom nodes
            keywords: [label.toLowerCase()]
        });

        // Reset
        setLabel('');
        setSub('');
        setUrl('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-matte-black border border-terminal-green w-full max-w-md p-6 rounded-xl shadow-[0_0_30px_rgba(0,255,65,0.2)]"
                    >
                        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-2">
                            <h2 className="text-terminal-green font-mono text-lg tracking-wider">> ADD_NEW_NODE</h2>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-sm">
                            <div>
                                <label className="block text-gray-400 mb-1 text-xs">LABEL</label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="E.G. THE ARCHITECT"
                                    className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-terminal-green focus:outline-none transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-1 text-xs">SUBTITLE</label>
                                <input
                                    type="text"
                                    value={sub}
                                    onChange={(e) => setSub(e.target.value)}
                                    placeholder="E.G. GITHUB TRENDS"
                                    className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-terminal-green focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-1 text-xs">URL</label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="HTTPS://..."
                                    className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-terminal-green focus:outline-none transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-1 text-xs">COLOR_HEX</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="h-9 w-9 bg-transparent border-0 p-0 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="flex-1 bg-black border border-gray-700 rounded p-2 text-white focus:border-terminal-green focus:outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-terminal-green/10 border border-terminal-green text-terminal-green py-3 rounded hover:bg-terminal-green hover:text-black transition-all font-bold tracking-widest mt-4 flex items-center justify-center space-x-2 group"
                            >
                                <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                                <span>INITIALIZE NODE</span>
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddNodeModal;
