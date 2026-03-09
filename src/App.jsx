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
import { getStoredState, isCloudConfigured, setStoredState, subscribeStoredState, testCloudConnection } from './lib/stateStorage';
import './App.css';

const CAMPAIGN_AUTH_SCOPE = 'campaign_auth_v1';

function createDefaultTracking() {
  return { active: null, completed: [], denied: [] };
}

function createMissionPayload() {
  return {
    title: MISSION_TITLE,
    npc: MISSION_NPC,
    summary: MISSION_SUMMARY,
    clue: MISSION_CLUE,
  };
}

async function loadCampaignAuth(campaignId) {
  return getStoredState({
    campaignId,
    playerId: '__system__',
    scope: CAMPAIGN_AUTH_SCOPE,
    fallback: null,
  });
}

function saveCampaignAuth(campaignId, data) {
  setStoredState({
    campaignId,
    playerId: '__system__',
    scope: CAMPAIGN_AUTH_SCOPE,
    data,
  });
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
  const [loginUserInput, setLoginUserInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sessionConfig, setSessionConfig] = useState(null);
  const [campaignPlayers, setCampaignPlayers] = useState([]);
  const [masterSelectedPlayer, setMasterSelectedPlayer] = useState('');
  const [cloudTestResult, setCloudTestResult] = useState('');
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [createCampaignId, setCreateCampaignId] = useState('nightcity-main');
  const [createMasterUser, setCreateMasterUser] = useState('mestre');
  const [createMasterPassword, setCreateMasterPassword] = useState('');
  const [createPlayers, setCreatePlayers] = useState([
    { name: '404', password: '' },
    { name: 'Soren', password: '' },
  ]);

  const [trackingByPlayer, setTrackingByPlayer] = useState({});
  const [showMissionDecision, setShowMissionDecision] = useState(false);

  const [audioReady, setAudioReady] = useState(false);
  const [experienceStarted, setExperienceStarted] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ loaded: 0, total: 1 });
  const [imagePopup, setImagePopup] = useState(null);
  const [trackingHydrated, setTrackingHydrated] = useState(false);
  const consumedCallTriggerRef = useRef('');
  const consumedImageTriggerRef = useRef('');

  const isSessionReady = Boolean(sessionConfig);
  const currentPlayerId = useMemo(() => {
    if (!sessionConfig) return null;
    return sessionConfig.role === 'master' ? masterSelectedPlayer : sessionConfig.playerId;
  }, [masterSelectedPlayer, sessionConfig]);

  useEffect(() => {
    if (sessionConfig?.role !== 'master') return;
    if (campaignPlayers.length === 0) {
      setMasterSelectedPlayer('');
      return;
    }
    if (!campaignPlayers.includes(masterSelectedPlayer)) {
      setMasterSelectedPlayer(campaignPlayers[0]);
    }
  }, [campaignPlayers, masterSelectedPlayer, sessionConfig]);

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

    let cancelled = false;
    setTrackingHydrated(false);
    const loaded = {};
    const playersToLoad = sessionConfig.role === 'master' ? campaignPlayers : [sessionConfig.playerId];
    Promise.all(
      playersToLoad.map(async (playerId) => {
        const state = await getStoredState({
          campaignId: sessionConfig.campaignId,
          playerId,
          scope: 'mission_tracking',
          fallback: createDefaultTracking(),
        });
        return [playerId, state];
      })
    ).then((entries) => {
      if (cancelled) return;
      for (const [playerId, state] of entries) {
        loaded[playerId] = {
          active: state?.active ?? null,
          completed: Array.isArray(state?.completed) ? state.completed : [],
          denied: Array.isArray(state?.denied) ? state.denied : [],
        };
      }
      setTrackingByPlayer(loaded);
      setTrackingHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [campaignPlayers, sessionConfig]);

  useEffect(() => {
    if (!sessionConfig) return;

    openMenu();
  }, [sessionConfig, openMenu]);

  useEffect(() => {
    if (!sessionConfig || sessionConfig.role !== 'player' || !sessionConfig.playerId) {
      consumedCallTriggerRef.current = '';
      consumedImageTriggerRef.current = '';
      return;
    }

    let firstCallEvent = true;
    let firstImageEvent = true;

    const unsubscribeCall = subscribeStoredState({
      campaignId: sessionConfig.campaignId,
      playerId: sessionConfig.playerId,
      scope: 'event_call_trigger',
      fallback: null,
      onChange: (parsed) => {
        const triggerId = parsed?.id ?? '';
        if (!triggerId) return;

        if (firstCallEvent) {
          consumedCallTriggerRef.current = triggerId;
          firstCallEvent = false;
          return;
        }

        if (consumedCallTriggerRef.current === triggerId) return;
        consumedCallTriggerRef.current = triggerId;
        openIncoming();
      },
    });

    const unsubscribeImage = subscribeStoredState({
      campaignId: sessionConfig.campaignId,
      playerId: sessionConfig.playerId,
      scope: 'event_image_trigger',
      fallback: null,
      onChange: (parsed) => {
        const triggerId = parsed?.id ?? '';
        const imageUrl = parsed?.imageUrl?.trim?.() ?? '';
        if (!triggerId || !imageUrl) return;

        if (firstImageEvent) {
          consumedImageTriggerRef.current = triggerId;
          firstImageEvent = false;
          return;
        }

        if (consumedImageTriggerRef.current === triggerId) return;
        consumedImageTriggerRef.current = triggerId;
        setImagePopup({
          title: parsed?.title?.trim?.() || 'TRANSMISSAO VISUAL',
          imageUrl,
          source: parsed?.source ?? 'master',
        });
      },
    });

    return () => {
      unsubscribeCall();
      unsubscribeImage();
    };
  }, [openIncoming, sessionConfig]);

  useEffect(() => {
    if (!sessionConfig || !trackingHydrated) return;

    for (const [playerId, tracking] of Object.entries(trackingByPlayer)) {
      setStoredState({
        campaignId: sessionConfig.campaignId,
        playerId,
        scope: 'mission_tracking',
        data: tracking,
      });
    }
  }, [sessionConfig, trackingByPlayer, trackingHydrated]);

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

  const handleStartSession = async () => {
    const campaignId = campaignIdInput.trim() || 'nightcity-main';
    const username = loginUserInput.trim();
    const password = loginPasswordInput;

    if (!username || !password) {
      setLoginError('Informe usuario e senha.');
      return;
    }

    const auth = await loadCampaignAuth(campaignId);
    if (!auth?.master?.username || !auth?.master?.password) {
      setLoginError('Campanha sem configuracao de acesso. Crie a campanha primeiro.');
      return;
    }

    const players = Array.isArray(auth.players) ? auth.players.map((player) => player.id).filter(Boolean) : [];
    setCampaignPlayers(players);
    setLoginError('');

    if (username === auth.master.username && password === auth.master.password) {
      setSessionConfig({
        campaignId,
        role: 'master',
        playerId: null,
      });
      setMasterSelectedPlayer(players[0] ?? '');
      return;
    }

    const matchedPlayer = (auth.players ?? []).find((player) => player.id === username && player.password === password);
    if (!matchedPlayer) {
      setLoginError('Usuario ou senha invalidos.');
      return;
    }

    setSessionConfig({
      campaignId,
      role: 'player',
      playerId: matchedPlayer.id,
    });
  };

  const handleCreatePlayerChange = (index, field, value) => {
    setCreatePlayers((prev) =>
      prev.map((player, playerIndex) => (playerIndex === index ? { ...player, [field]: value } : player))
    );
  };

  const handleAddCreatePlayer = () => {
    setCreatePlayers((prev) => [...prev, { name: '', password: '' }]);
  };

  const handleRemoveCreatePlayer = (index) => {
    setCreatePlayers((prev) => prev.filter((_, playerIndex) => playerIndex !== index));
  };

  const handleCreateCampaign = () => {
    const campaignId = createCampaignId.trim();
    const masterUser = createMasterUser.trim();
    const masterPass = createMasterPassword;
    const normalizedPlayers = createPlayers
      .map((player) => ({ id: player.name.trim(), password: player.password }))
      .filter((player) => player.id);

    const duplicateNames = new Set();
    for (const player of normalizedPlayers) {
      if (duplicateNames.has(player.id)) {
        setLoginError('Nao pode repetir nome de player na campanha.');
        return;
      }
      duplicateNames.add(player.id);
    }

    if (!campaignId || !masterUser || !masterPass) {
      setLoginError('Preencha campanha, usuario mestre e senha mestre.');
      return;
    }

    const hasPlayerWithoutPassword = normalizedPlayers.some((player) => !player.password);
    if (hasPlayerWithoutPassword) {
      setLoginError('Todo player precisa de senha.');
      return;
    }

    saveCampaignAuth(campaignId, {
      master: { username: masterUser, password: masterPass },
      players: normalizedPlayers,
      updatedAt: Date.now(),
    });

    setCampaignIdInput(campaignId);
    setLoginUserInput(masterUser);
    setLoginPasswordInput(masterPass);
    setCampaignPlayers(normalizedPlayers.map((player) => player.id));
    setShowCreateCampaign(false);
    setLoginError('');
    playSound('button');
  };

  const handleTestCloud = async () => {
    setIsTestingCloud(true);
    setCloudTestResult('Testando conexao...');
    const result = await testCloudConnection();
    setCloudTestResult(result.ok ? `OK: ${result.message}` : `ERRO: ${result.message}`);
    setIsTestingCloud(false);
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
    setStoredState({
      campaignId: sessionConfig.campaignId,
      playerId: targetPlayerId,
      scope: 'event_call_trigger',
      data: payload,
    });
  };

  const handleMasterTriggerImage = ({ targetPlayerId, imageUrl, title }) => {
    if (!sessionConfig || sessionConfig.role !== 'master' || !targetPlayerId || !imageUrl?.trim()) {
      return;
    }

    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      source: 'master',
      targetPlayerId,
      imageUrl: imageUrl.trim(),
      title: title?.trim() || '',
    };
    setStoredState({
      campaignId: sessionConfig.campaignId,
      playerId: targetPlayerId,
      scope: 'event_image_trigger',
      data: payload,
    });
  };

  const handleCloseImagePopup = () => {
    playSound('button');
    setImagePopup(null);
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
          <div className="session-cloud-indicator">
            Banco: {isCloudConfigured() ? 'SUPABASE CONECTADO' : 'LOCAL (sem Supabase)'}
          </div>
          <button className="session-test-btn" onClick={handleTestCloud} disabled={isTestingCloud}>
            {isTestingCloud ? 'TESTANDO...' : 'TESTAR CONEXAO'}
          </button>
          {cloudTestResult ? <div className="session-cloud-result">{cloudTestResult}</div> : null}
          <label className="session-label">
            Campanha
            <input
              className="session-input"
              value={campaignIdInput}
              onChange={(event) => setCampaignIdInput(event.target.value)}
            />
          </label>
          <label className="session-label">
            Usuario
            <input
              className="session-input"
              value={loginUserInput}
              onChange={(event) => setLoginUserInput(event.target.value)}
              placeholder="Ex: mestre, 404, Soren"
            />
          </label>
          <label className="session-label">
            Senha
            <input
              className="session-input"
              type="password"
              value={loginPasswordInput}
              onChange={(event) => setLoginPasswordInput(event.target.value)}
              placeholder="Senha do usuario"
            />
          </label>
          {loginError ? <div className="session-error">{loginError}</div> : null}
          <button className="session-start-btn" onClick={() => void handleStartSession()}>
            ENTRAR NO TERMINAL
          </button>
          <button className="session-test-btn" onClick={() => setShowCreateCampaign((prev) => !prev)}>
            {showCreateCampaign ? 'FECHAR CRIAR CAMPANHA' : 'CRIAR CAMPANHA'}
          </button>
          {showCreateCampaign ? (
            <div className="campaign-create-box">
              <div className="campaign-create-title">Nova Campanha</div>
              <label className="session-label">
                ID da campanha
                <input
                  className="session-input"
                  value={createCampaignId}
                  onChange={(event) => setCreateCampaignId(event.target.value)}
                />
              </label>
              <label className="session-label">
                Usuario mestre
                <input
                  className="session-input"
                  value={createMasterUser}
                  onChange={(event) => setCreateMasterUser(event.target.value)}
                />
              </label>
              <label className="session-label">
                Senha mestre
                <input
                  className="session-input"
                  type="password"
                  value={createMasterPassword}
                  onChange={(event) => setCreateMasterPassword(event.target.value)}
                />
              </label>
              <div className="campaign-players-header">Players da campanha</div>
              {createPlayers.map((player, index) => (
                <div key={`create-player-${index}`} className="campaign-player-row">
                  <input
                    className="session-input"
                    value={player.name}
                    onChange={(event) => handleCreatePlayerChange(index, 'name', event.target.value)}
                    placeholder="Nome do player"
                  />
                  <input
                    className="session-input"
                    type="password"
                    value={player.password}
                    onChange={(event) => handleCreatePlayerChange(index, 'password', event.target.value)}
                    placeholder="Senha"
                  />
                  <button className="session-test-btn" onClick={() => handleRemoveCreatePlayer(index)}>
                    REMOVER
                  </button>
                </div>
              ))}
              <div className="campaign-actions">
                <button className="session-test-btn" onClick={handleAddCreatePlayer}>
                  + ADICIONAR PLAYER
                </button>
                <button className="session-start-btn" onClick={handleCreateCampaign}>
                  SALVAR CAMPANHA
                </button>
              </div>
            </div>
          ) : null}
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
          players={campaignPlayers}
          selectedPlayer={masterSelectedPlayer}
          onSelectPlayer={setMasterSelectedPlayer}
          allTracking={trackingByPlayer}
          onTriggerCallForPlayer={handleMasterTriggerCall}
          onTriggerImageForPlayer={handleMasterTriggerImage}
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
      {imagePopup ? (
        <div className="image-popup-overlay" onClick={handleCloseImagePopup}>
          <div className="image-popup-card" onClick={(event) => event.stopPropagation()}>
            <div className="image-popup-header">
              <div className="image-popup-title">{imagePopup.title}</div>
              <button className="image-popup-close" onClick={handleCloseImagePopup}>
                FECHAR
              </button>
            </div>
            <img src={imagePopup.imageUrl} alt={imagePopup.title} className="image-popup-image" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
