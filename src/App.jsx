import { useEffect, useMemo, useRef, useState } from 'react';
import IncomingCall from './components/IncomingCall';
import CallScreen from './components/CallScreen';
import MainMenu from './components/menu/MainMenu';
import NpcsPanel from './components/menu/NpcsPanel';
import LocationsPanel from './components/menu/LocationsPanel';
import MissionsPanel from './components/menu/MissionsPanel';
import DocumentsPanel from './components/menu/DocumentsPanel';
import InventoryPanel from './components/menu/InventoryPanel';
import CharacterProfilePanel from './components/menu/CharacterProfilePanel';
import useCallFlow from './hooks/useCallFlow';
import { initAudioUnlock, onSoundEnded, playSound, preloadAllSounds, stopNarration, stopSound } from './sound/soundSystem';
import { MISSION_CLUE, MISSION_NPC, MISSION_SUMMARY, MISSION_TITLE } from './constants/ui';
import { ACCESS_KEYS, PLAYERS } from './constants/accessKeys';
import './App.css';

const MISSION_TRACKING_PREFIX = 'rc_mission_tracking_v4';
const CALL_TRIGGER_PREFIX = 'rc_call_trigger_v1';

function createDefaultTracking() {
  return { active: null, completed: [], denied: [] };
}

function trackingStorageKey(campaignId, playerId) {
  return `${MISSION_TRACKING_PREFIX}:${campaignId}:${playerId}`;
}

function callTriggerStorageKey(campaignId, playerId) {
  return `${CALL_TRIGGER_PREFIX}:${campaignId}:${playerId}`;
}

function loadTracking(campaignId, playerId) {
  try {
    const raw = localStorage.getItem(trackingStorageKey(campaignId, playerId));
    if (!raw) return createDefaultTracking();

    const parsed = JSON.parse(raw);
    return {
      active: parsed?.active ?? null,
      completed: Array.isArray(parsed?.completed) ? parsed.completed : [],
      denied: Array.isArray(parsed?.denied) ? parsed.denied : [],
    };
  } catch {
    return createDefaultTracking();
  }
}

function createMissionPayload() {
  return {
    title: MISSION_TITLE,
    npc: MISSION_NPC,
    summary: MISSION_SUMMARY,
    clue: MISSION_CLUE,
  };
}

function App() {
  const {
    currentView,
    answerCall,
    openIncoming,
    exitCallToMenu,
    openNpcs,
    openLocations,
    openMissions,
    openDocuments,
    openInventory,
    openCharacterProfile,
    openMenu,
    openCall,
  } = useCallFlow();

  const [campaignIdInput, setCampaignIdInput] = useState('nightcity-main');
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sessionConfig, setSessionConfig] = useState(null);
  const [masterSelectedPlayer, setMasterSelectedPlayer] = useState(PLAYERS[0]);

  const [trackingByPlayer, setTrackingByPlayer] = useState({});
  const [showMissionDecision, setShowMissionDecision] = useState(false);

  const [audioReady, setAudioReady] = useState(false);
  const [experienceStarted, setExperienceStarted] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ loaded: 0, total: 1 });
  const consumedCallTriggerRef = useRef('');

  const isSessionReady = Boolean(sessionConfig);
  const currentPlayerId = useMemo(() => {
    if (!sessionConfig) return null;
    return sessionConfig.role === 'master' ? masterSelectedPlayer : sessionConfig.playerId;
  }, [masterSelectedPlayer, sessionConfig]);

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
    if (!audioReady || !experienceStarted || !isSessionReady || currentView !== 'incoming') {
      stopSound('incomingCall');
      return;
    }

    playSound('incomingCall', { loop: true, volume: 0.6, reset: true });
    return () => stopSound('incomingCall');
  }, [audioReady, experienceStarted, isSessionReady, currentView]);

  useEffect(() => {
    if (currentView !== 'call') {
      stopNarration();
      setShowMissionDecision(false);
    }
  }, [currentView]);

  useEffect(() => {
    if (!sessionConfig) return;

    const loaded = {};
    const playersToLoad = sessionConfig.role === 'master' ? PLAYERS : [sessionConfig.playerId];
    for (const playerId of playersToLoad) {
      loaded[playerId] = loadTracking(sessionConfig.campaignId, playerId);
    }
    setTrackingByPlayer(loaded);
  }, [sessionConfig]);

  useEffect(() => {
    if (!sessionConfig) return;

    openMenu();
    if (sessionConfig.role === 'master') {
      return;
    }

    const timer = setTimeout(() => {
      openIncoming();
    }, 6000);

    return () => {
      clearTimeout(timer);
    };
  }, [sessionConfig, openIncoming, openMenu]);

  useEffect(() => {
    consumedCallTriggerRef.current = '';
  }, [sessionConfig?.campaignId, sessionConfig?.playerId, sessionConfig?.role]);

  useEffect(() => {
    if (!sessionConfig || sessionConfig.role !== 'player' || !sessionConfig.playerId) {
      return;
    }

    const triggerKey = callTriggerStorageKey(sessionConfig.campaignId, sessionConfig.playerId);
    const tryOpenIncomingFromTrigger = () => {
      try {
        const raw = localStorage.getItem(triggerKey);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        const triggerId = parsed?.id ?? '';
        if (!triggerId || consumedCallTriggerRef.current === triggerId) return;

        consumedCallTriggerRef.current = triggerId;
        openIncoming();
      } catch {
        // Ignore malformed trigger payloads.
      }
    };

    const handleStorage = (event) => {
      if (event.key === triggerKey) {
        tryOpenIncomingFromTrigger();
      }
    };

    const poll = setInterval(tryOpenIncomingFromTrigger, 1200);
    window.addEventListener('storage', handleStorage);
    tryOpenIncomingFromTrigger();

    return () => {
      clearInterval(poll);
      window.removeEventListener('storage', handleStorage);
    };
  }, [openIncoming, sessionConfig]);

  useEffect(() => {
    if (!sessionConfig) return;

    for (const [playerId, tracking] of Object.entries(trackingByPlayer)) {
      const key = trackingStorageKey(sessionConfig.campaignId, playerId);
      localStorage.setItem(key, JSON.stringify(tracking));
    }
  }, [sessionConfig, trackingByPlayer]);

  useEffect(() => {
    const off = onSoundEnded('narration', () => {
      if (!currentPlayerId) return;
      const active = trackingByPlayer[currentPlayerId]?.active ?? null;
      if (currentView === 'call' && !active) {
        setShowMissionDecision(true);
      }
    });

    return off;
  }, [currentPlayerId, currentView, trackingByPlayer]);

  const updateTrackingForPlayer = (playerId, updater) => {
    if (!playerId) return;
    setTrackingByPlayer((prev) => {
      const current = prev[playerId] ?? createDefaultTracking();
      const updated = updater(current);
      return {
        ...prev,
        [playerId]: updated,
      };
    });
  };

  const handleAcceptMission = () => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => ({
      ...current,
      active: createMissionPayload(),
    }));
    setShowMissionDecision(false);
  };

  const handleDenyMission = () => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => ({
      ...current,
      denied: [createMissionPayload(), ...(current.denied ?? [])].slice(0, 6),
    }));
    setShowMissionDecision(false);
  };

  const handleCompleteMission = () => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => {
      if (!current.active) return current;
      return {
        ...current,
        active: null,
        completed: [current.active, ...(current.completed ?? [])].slice(0, 6),
      };
    });
  };

  const handleDeleteMission = () => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => ({
      ...current,
      active: null,
    }));
  };

  const handleUpdateMission = (updates) => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => {
      if (!current.active) return current;
      return {
        ...current,
        active: {
          ...current.active,
          ...updates,
        },
      };
    });
  };

  const handleNarrationStart = () => {
    setShowMissionDecision(false);
  };

  const handleStartSession = () => {
    const key = accessKeyInput.trim();
    const access = ACCESS_KEYS[key];

    if (!access) {
      setLoginError('Chave invalida.');
      return;
    }

    const campaignId = campaignIdInput.trim() || 'nightcity-main';
    setLoginError('');
    setSessionConfig({
      campaignId,
      role: access.role,
      playerId: access.playerId,
    });
    if (access.role === 'master') {
      setMasterSelectedPlayer(PLAYERS[0]);
    }
  };

  const handleMasterTriggerCall = (targetPlayerId) => {
    if (!sessionConfig || sessionConfig.role !== 'master' || !targetPlayerId) {
      return;
    }

    playSound('button');
    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      source: 'master',
      targetPlayerId,
    };
    localStorage.setItem(callTriggerStorageKey(sessionConfig.campaignId, targetPlayerId), JSON.stringify(payload));
  };

  const currentTracking = currentPlayerId ? trackingByPlayer[currentPlayerId] ?? createDefaultTracking() : createDefaultTracking();

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

  if (!isSessionReady) {
    return (
      <div className="app loading-screen">
        <div className="session-card">
          <div className="session-title">ACESSO AO TERMINAL</div>
          <label className="session-label">
            Campanha
            <input
              className="session-input"
              value={campaignIdInput}
              onChange={(event) => setCampaignIdInput(event.target.value)}
            />
          </label>
          <label className="session-label">
            Key de acesso
            <input
              className="session-input"
              value={accessKeyInput}
              onChange={(event) => setAccessKeyInput(event.target.value)}
              placeholder="Ex: PLAYER_404_KEY"
            />
          </label>
          {loginError ? <div className="session-error">{loginError}</div> : null}
          <button className="session-start-btn" onClick={handleStartSession}>
            ENTRAR NO TERMINAL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {currentView === 'incoming' ? <IncomingCall onAnswer={answerCall} /> : null}
      {currentView === 'call' ? (
        <CallScreen
          onExit={exitCallToMenu}
          showMissionDecision={showMissionDecision}
          onAcceptMission={handleAcceptMission}
          onDenyMission={handleDenyMission}
          onNarrationStart={handleNarrationStart}
        />
      ) : null}
      {currentView === 'menu' ? (
        <MainMenu
          onOpenLocations={openLocations}
          onOpenMissions={openMissions}
          onOpenNpcs={openNpcs}
          onOpenDocuments={openDocuments}
          onOpenInventory={openInventory}
          onOpenCharacterProfile={openCharacterProfile}
          activeMission={currentTracking.active}
          completedMissions={currentTracking.completed}
          deniedMissions={currentTracking.denied}
          onCompleteMission={handleCompleteMission}
          onDeleteMission={handleDeleteMission}
          onUpdateMission={handleUpdateMission}
          campaignId={sessionConfig.campaignId}
          playerId={currentPlayerId}
          role={sessionConfig.role}
          players={PLAYERS}
          selectedPlayer={masterSelectedPlayer}
          onSelectPlayer={setMasterSelectedPlayer}
          allTracking={trackingByPlayer}
          onTriggerCallForPlayer={handleMasterTriggerCall}
        />
      ) : null}
      {currentView === 'npcs' ? (
        <NpcsPanel
          onBack={openMenu}
          onOpenCall={openCall}
          campaignId={sessionConfig.campaignId}
          playerId={currentPlayerId}
        />
      ) : null}
      {currentView === 'locations' ? (
        <LocationsPanel
          onBack={openMenu}
          campaignId={sessionConfig.campaignId}
          playerId={currentPlayerId}
        />
      ) : null}
      {currentView === 'missions' ? (
        <MissionsPanel
          onBack={openMenu}
          activeMission={currentTracking.active}
          completedMissions={currentTracking.completed}
          deniedMissions={currentTracking.denied}
        />
      ) : null}
      {currentView === 'documents' ? (
        <DocumentsPanel
          onBack={openMenu}
          campaignId={sessionConfig.campaignId}
          playerId={currentPlayerId}
        />
      ) : null}
      {currentView === 'inventory' ? (
        <InventoryPanel
          onBack={openMenu}
          campaignId={sessionConfig.campaignId}
          playerId={currentPlayerId}
        />
      ) : null}
      {currentView === 'characterProfile' ? (
        <CharacterProfilePanel playerId={currentPlayerId} onBack={openMenu} />
      ) : null}
    </div>
  );
}

export default App;
