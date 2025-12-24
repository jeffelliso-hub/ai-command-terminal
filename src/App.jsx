import { useState } from 'react';
import IntroSequence from './components/IntroSequence';
import CommandTerminal from './components/CommandTerminal';

function App() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden relative font-sans">
      {showIntro ? (
        <IntroSequence onComplete={() => setShowIntro(false)} />
      ) : (
        <CommandTerminal />
      )}
    </div>
  )
}

export default App;
