import IncomingCall from './components/IncomingCall';
import CallScreen from './components/CallScreen';
import MainMenu from './components/menu/MainMenu';
import NpcsPanel from './components/menu/NpcsPanel';
import LocationsPanel from './components/menu/LocationsPanel';
import useCallFlow from './hooks/useCallFlow';
import { useEffect, useState } from 'react';
import { initAudioUnlock, playSound, preloadAllSounds, stopNarration, stopSound } from './sound/soundSystem';
import './App.css';

function App() {
  const {
    currentView,
    answerCall,
    exitCallToMenu,
    openNpcs,
    openLocations,
    openMenu,
    openCall,
  } = useCallFlow();
  const [audioReady, setAudioReady] = useState(false);
  const [experienceStarted, setExperienceStarted] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ loaded: 0, total: 1 });

  useEffect(() => {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  useEffect(() => {
    initAudioUnlock();

    preloadAllSounds((progress) => {
      setAudioProgress(progress);
    }).finally(() => {
      setAudioReady(true);
    });
  }, []);

  useEffect(() => {
    if (!audioReady || !experienceStarted || currentView !== 'incoming') {
      stopSound('incomingCall');
      return;
    }
    playSound('incomingCall', { loop: true, volume: 0.6, reset: true });

    return () => {
      stopSound('incomingCall');
    };
  }, [audioReady, experienceStarted, currentView]);

  useEffect(() => {
    if (currentView !== 'call') {
      stopNarration();
    }
  }, [currentView]);

  if (!audioReady) {
    const percent = Math.round((audioProgress.loaded / audioProgress.total) * 100);
    return (
      <div className="app loading-screen">
        <div className="loading-card">
          <div className="loading-title">CARREGANDO AUDIO</div>
          <div className="loading-subtitle">
            {audioProgress.loaded}/{audioProgress.total} arquivos
          </div>
          <div className="loading-bar">
            <div className="loading-bar-fill" style={{ width: `${percent}%` }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!experienceStarted) {
    return (
      <div className="app loading-screen">
        <button className="start-button" onClick={() => setExperienceStarted(true)}>
          CLIQUE PARA INICIAR
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      {currentView === 'incoming' ? <IncomingCall onAnswer={answerCall} /> : null}
      {currentView === 'call' ? <CallScreen onExit={exitCallToMenu} /> : null}
      {currentView === 'menu' ? <MainMenu onOpenLocations={openLocations} onOpenNpcs={openNpcs} /> : null}
      {currentView === 'npcs' ? <NpcsPanel onBack={openMenu} onOpenCall={openCall} /> : null}
      {currentView === 'locations' ? <LocationsPanel onBack={openMenu} /> : null}
    </div>
  );
}

export default App;
