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
import {
  CALLER_NAME,
  CONNECTION_CODE,
  INCOMING_STATUS_TEXT,
  MESSAGE_SENDER,
  MESSAGE_TEXT,
  MESSAGE_TIMESTAMP,
  MISSION_CLUE,
  MISSION_NPC,
  MISSION_SUMMARY,
  MISSION_TITLE,
} from './constants/ui';
import { getStoredState, isCloudConfigured, setStoredState, storedStateExists, subscribeStoredState, testCloudConnection } from './lib/stateStorage';
import './App.css';

const CAMPAIGN_AUTH_SCOPE = 'campaign_auth_v1';
const CREATE_CAMPAIGN_BOOT_LINES = [
  { text: '> ESTABELECENDO CONEXAO...', type: 'line' },
  { text: '> SINCRONIZANDO PROTOCOLOS DE SEGURANCA...', type: 'line' },
  { text: '> VERIFICANDO ASSINATURA NEURAL...', type: 'line' },
  { text: '[OK]', type: 'ok' },
  { text: 'SINAL DE ACESSO DETECTADO.', type: 'text' },
  { text: 'CONFIRMANDO PRESENCA DE NETRUNNER NO TERMINAL.', type: 'text' },
  { text: 'Rede protegida ativa. Atividades monitoradas por protocolos corporativos.', type: 'text' },
  { text: 'Para continuar, identifique-se.', type: 'text' },
  { text: '>> AUTENTICACAO NECESSARIA PARA LIBERACAO DE TERMINAL', type: 'prompt' },
];
const BOOT_CHAR_DELAY_MS = 18;
const BOOT_LINE_GAP_MS = 120;

function bootLineClass(type) {
  if (type === 'ok') return 'terminal-boot-ok';
  if (type === 'prompt') return 'terminal-boot-prompt';
  if (type === 'text') return 'terminal-boot-text';
  return 'terminal-boot-line';
}

function createDefaultTracking() {
  return { active: null, completed: [], denied: [] };
}

function createMissionPayload() {
  return {
    title: MISSION_TITLE,
    npc: MISSION_NPC,
    summary: MISSION_SUMMARY,
    clue: MISSION_CLUE,
    attachments: [],
  };
}

function createDefaultCallEvent() {
  return {
    callerName: CALLER_NAME,
    connectionCode: CONNECTION_CODE,
    statusText: INCOMING_STATUS_TEXT,
    avatarUrl: '',
    messageText: MESSAGE_TEXT,
    messageSender: MESSAGE_SENDER,
    messageTimestamp: MESSAGE_TIMESTAMP,
    audioUrl: '',
    mission: createMissionPayload(),
  };
}

function createCallEventFromContact(contact) {
  if (!contact) return createDefaultCallEvent();
  return {
    callerName: contact.name || CALLER_NAME,
    connectionCode: contact.connection || CONNECTION_CODE,
    statusText: contact.status || INCOMING_STATUS_TEXT,
    avatarUrl: contact.avatarUrl || '',
    messageText: contact.messageText || MESSAGE_TEXT,
    messageSender: contact.messageSender || `${contact.name || CALLER_NAME} >>`,
    messageTimestamp: contact.messageTimestamp || MESSAGE_TIMESTAMP,
    audioUrl: contact.audioUrl || '',
    mission: contact.mission || createMissionPayload(),
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
  const [bootRenderedLines, setBootRenderedLines] = useState([]);
  const [bootTypingLine, setBootTypingLine] = useState(null);
  const [bootCompleted, setBootCompleted] = useState(false);

  const [trackingByPlayer, setTrackingByPlayer] = useState({});
  const [showMissionDecision, setShowMissionDecision] = useState(false);
  const [showMissionPopup, setShowMissionPopup] = useState(false);

  const [audioReady, setAudioReady] = useState(false);
  const [experienceStarted, setExperienceStarted] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ loaded: 0, total: 1 });
  const [imagePopup, setImagePopup] = useState(null);
  const [activeCallEvent, setActiveCallEvent] = useState(createDefaultCallEvent());
  const [pendingMissionOffer, setPendingMissionOffer] = useState(createMissionPayload());
  const [contactsByPlayer, setContactsByPlayer] = useState({});
  const [trackingHydrated, setTrackingHydrated] = useState(false);
  const consumedCallTriggerRef = useRef('');
  const consumedImageTriggerRef = useRef('');
  const consumedMissionTriggerRef = useRef('');
  const lastTerminalTypeAtRef = useRef(0);
  const bootTimerRef = useRef(null);
  const bootIntervalRef = useRef(null);

  const playTerminalType = () => {
    const now = Date.now();
    if (now - lastTerminalTypeAtRef.current < 45) return;
    lastTerminalTypeAtRef.current = now;
    playSound('terminalType', { volume: 0.22, reset: true });
  };

  const clearBootAnimation = () => {
    if (bootTimerRef.current) {
      window.clearTimeout(bootTimerRef.current);
      bootTimerRef.current = null;
    }
    if (bootIntervalRef.current) {
      window.clearInterval(bootIntervalRef.current);
      bootIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!showCreateCampaign) {
      clearBootAnimation();
      setBootRenderedLines([]);
      setBootTypingLine(null);
      setBootCompleted(false);
      stopSound('terminalWriting');
      return;
    }

    clearBootAnimation();
    stopSound('terminalWriting');
    setBootRenderedLines([]);
    setBootTypingLine(null);
    setBootCompleted(false);

    let cancelled = false;
    let lineIndex = 0;

    const typeNextLine = () => {
      if (cancelled) return;
      if (lineIndex >= CREATE_CAMPAIGN_BOOT_LINES.length) {
        setBootTypingLine(null);
        setBootCompleted(true);
        stopSound('terminalWriting');
        return;
      }

      const line = CREATE_CAMPAIGN_BOOT_LINES[lineIndex];
      let charIndex = 0;

      stopSound('terminalWriting');
      playSound('terminalWriting', { loop: false, volume: 0.16, reset: true });

      setBootTypingLine({ type: line.type, text: '' });

      bootIntervalRef.current = window.setInterval(() => {
        if (cancelled) return;
        charIndex += 1;
        const partial = line.text.slice(0, charIndex);
        setBootTypingLine({ type: line.type, text: partial });

        if (charIndex < line.text.length) return;

        if (bootIntervalRef.current) {
          window.clearInterval(bootIntervalRef.current);
          bootIntervalRef.current = null;
        }

        setBootRenderedLines((prev) => [...prev, line]);
        setBootTypingLine(null);
        lineIndex += 1;

        bootTimerRef.current = window.setTimeout(typeNextLine, BOOT_LINE_GAP_MS);
      }, BOOT_CHAR_DELAY_MS);
    };

    bootTimerRef.current = window.setTimeout(typeNextLine, 120);

    return () => {
      cancelled = true;
      clearBootAnimation();
      stopSound('terminalWriting');
    };
  }, [showCreateCampaign]);
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
    }
  }, [currentView]);

  useEffect(() => {
    if (!sessionConfig) return;

    setTrackingHydrated(false);
    const playersToWatch = sessionConfig.role === 'master' ? campaignPlayers : [sessionConfig.playerId];

    const unsubscribers = playersToWatch.map((playerId) =>
      subscribeStoredState({
        campaignId: sessionConfig.campaignId,
        playerId,
        scope: 'mission_tracking',
        fallback: createDefaultTracking(),
        onChange: (state) => {
          setTrackingByPlayer((prev) => ({
            ...prev,
            [playerId]: {
              active: state?.active ?? null,
              completed: Array.isArray(state?.completed) ? state.completed : [],
              denied: Array.isArray(state?.denied) ? state.denied : [],
            },
          }));
          setTrackingHydrated(true);
        },
      })
    );

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [campaignPlayers, sessionConfig]);

  useEffect(() => {
    if (!sessionConfig || sessionConfig.role !== 'master' || campaignPlayers.length === 0) {
      setContactsByPlayer({});
      return;
    }

    const unsubscribers = campaignPlayers.map((playerId) =>
      subscribeStoredState({
        campaignId: sessionConfig.campaignId,
        playerId,
        scope: 'panel_entries:contacts',
        fallback: [],
        onChange: (contacts) => {
          setContactsByPlayer((prev) => ({
            ...prev,
            [playerId]: Array.isArray(contacts) ? contacts : [],
          }));
        },
      })
    );

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
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
      consumedMissionTriggerRef.current = '';
      setShowMissionPopup(false);
      setShowMissionDecision(false);
      return;
    }

    let firstCallEvent = true;
    let firstImageEvent = true;
    let firstMissionEvent = true;

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
        if (parsed?.callEvent) {
          setActiveCallEvent({ ...createDefaultCallEvent(), ...parsed.callEvent });
          if (parsed?.callEvent?.mission) {
            setPendingMissionOffer(parsed.callEvent.mission);
          }
        }
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

    const unsubscribeMission = subscribeStoredState({
      campaignId: sessionConfig.campaignId,
      playerId: sessionConfig.playerId,
      scope: 'event_mission_offer',
      fallback: null,
      onChange: (parsed) => {
        const triggerId = parsed?.id ?? '';
        if (!triggerId) return;

        if (firstMissionEvent) {
          consumedMissionTriggerRef.current = triggerId;
          firstMissionEvent = false;
          return;
        }

        if (consumedMissionTriggerRef.current === triggerId) return;
        consumedMissionTriggerRef.current = triggerId;
        if (parsed?.mission) {
          setPendingMissionOffer(parsed.mission);
          setShowMissionPopup(true);
          setShowMissionDecision(false);
        }
      },
    });

    return () => {
      unsubscribeCall();
      unsubscribeImage();
      unsubscribeMission();
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

  const persistTrackingForPlayer = (playerId, tracking) => {
    if (!sessionConfig) return;
    setStoredState({
      campaignId: sessionConfig.campaignId,
      playerId,
      scope: 'mission_tracking',
      data: tracking,
    });
  };

  const handleAcceptMission = () => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => {
      const updated = {
        ...current,
        active: pendingMissionOffer ?? createMissionPayload(),
      };
      persistTrackingForPlayer(currentPlayerId, updated);
      return updated;
    });
    setShowMissionDecision(false);
    setShowMissionPopup(false);
  };

  const handleDenyMission = () => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => {
      const updated = {
        ...current,
        denied: [pendingMissionOffer ?? createMissionPayload(), ...(current.denied ?? [])].slice(0, 6),
      };
      persistTrackingForPlayer(currentPlayerId, updated);
      return updated;
    });
    setShowMissionDecision(false);
    setShowMissionPopup(false);
  };

  const handleCompleteMission = () => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => {
      if (!current.active) return current;
      const updated = {
        ...current,
        active: null,
        completed: [current.active, ...(current.completed ?? [])].slice(0, 6),
      };
      persistTrackingForPlayer(currentPlayerId, updated);
      return updated;
    });
  };

  const handleDeleteMission = () => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => {
      const updated = { ...current, active: null };
      persistTrackingForPlayer(currentPlayerId, updated);
      return updated;
    });
  };

  const handleAddDeniedMission = (mission) => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => {
      const updated = {
        ...current,
        denied: [mission ?? createMissionPayload(), ...(current.denied ?? [])].slice(0, 12),
      };
      persistTrackingForPlayer(currentPlayerId, updated);
      return updated;
    });
  };

  const handleRemoveDeniedMission = (index) => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => {
      const updated = {
        ...current,
        denied: (current.denied ?? []).filter((_, deniedIndex) => deniedIndex !== index),
      };
      persistTrackingForPlayer(currentPlayerId, updated);
      return updated;
    });
  };

  const handleUpdateMission = (updates) => {
    playSound('button');
    updateTrackingForPlayer(currentPlayerId, (current) => {
      if (!current.active) return current;
      const updated = {
        ...current,
        active: {
          ...current.active,
          ...updates,
        },
      };
      persistTrackingForPlayer(currentPlayerId, updated);
      return updated;
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
    playTerminalType();
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

  const handleCreateCampaign = async () => {
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

    try {
      const exists = await storedStateExists({
        campaignId,
        playerId: '__system__',
        scope: CAMPAIGN_AUTH_SCOPE,
      });
      if (exists) {
        setLoginError('Essa campanha ja existe. Escolha outro ID.');
        return;
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Falha ao verificar campanha no Supabase.');
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

  const handleMasterTriggerCall = (targetPlayerId, contact) => {
    if (!sessionConfig || sessionConfig.role !== 'master' || !targetPlayerId || !contact) {
      return;
    }

    playSound('button');
    const callEvent = createCallEventFromContact(contact);
    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      source: 'master',
      targetPlayerId,
      callEvent,
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

  const handleMasterOfferMission = (targetPlayerId, mission) => {
    if (!sessionConfig || sessionConfig.role !== 'master' || !targetPlayerId || !mission) {
      return;
    }

    playSound('button');
    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      source: 'master',
      targetPlayerId,
      mission,
    };
    setStoredState({
      campaignId: sessionConfig.campaignId,
      playerId: targetPlayerId,
      scope: 'event_mission_offer',
      data: payload,
    });
  };

  const handleCloseImagePopup = () => {
    playSound('button');
    setImagePopup(null);
  };

  const handleOpenContactEvent = (contact) => {
    const event = createCallEventFromContact(contact);
    setActiveCallEvent(event);
    setPendingMissionOffer(event.mission ?? createMissionPayload());
    openCall();
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
        </div>
        {showCreateCampaign ? (
          <div className="campaign-create-overlay" onClick={() => setShowCreateCampaign(false)}>
            <div className="campaign-create-modal" onClick={(event) => event.stopPropagation()}>
              <div className="campaign-create-box">
                <div className="campaign-create-terminal">
                  <div className="campaign-create-title">BOOT DE TERMINAL</div>
                  {bootRenderedLines.map((line, index) => (
                    <div
                      key={`${line.type}-${line.text}-${index}`}
                      className={bootLineClass(line.type)}
                    >
                      {line.text}
                    </div>
                  ))}
                  {bootTypingLine ? (
                    <div className={bootLineClass(bootTypingLine.type)}>
                      {bootTypingLine.text}
                      <span className="terminal-cmd-cursor">_</span>
                    </div>
                  ) : null}
                  {bootCompleted ? <div className="terminal-boot-cursor">AGUARDANDO CREDENCIAIS DO OPERADOR...</div> : null}
                </div>
                <div className="terminal-input-row">
                  <span className="terminal-inline-prompt">&gt;&gt; INSIRA O ID DE SUA CAMPANHA:</span>
                  <input
                    className="session-input terminal-inline-input"
                    value={createCampaignId}
                    onChange={(event) => {
                      playTerminalType();
                      setCreateCampaignId(event.target.value);
                    }}
                  />
                </div>
                <div className="terminal-input-row">
                  <span className="terminal-inline-prompt">&gt;&gt; DEFINA O OPERADOR MESTRE:</span>
                  <input
                    className="session-input terminal-inline-input"
                    value={createMasterUser}
                    onChange={(event) => {
                      playTerminalType();
                      setCreateMasterUser(event.target.value);
                    }}
                  />
                </div>
                <div className="terminal-input-row">
                  <span className="terminal-inline-prompt">&gt;&gt; DEFINA A SENHA DO MESTRE:</span>
                  <input
                    className="session-input terminal-inline-input"
                    type="password"
                    value={createMasterPassword}
                    onChange={(event) => {
                      playTerminalType();
                      setCreateMasterPassword(event.target.value);
                    }}
                  />
                </div>
                <div className="campaign-players-header">PLAYERS DA CAMPANHA</div>
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
                  <button className="session-test-btn" onClick={() => setShowCreateCampaign(false)}>
                    FECHAR
                  </button>
                </div>
                <div className="campaign-create-hint">
                  Dica: use players no formato <code>404:senha,Soren:senha</code>.
                </div>
                {loginError ? <div className="session-error">{loginError}</div> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="app">
      {currentView === 'incoming' ? (
        <IncomingCall
          onAnswer={answerCall}
          callerName={activeCallEvent.callerName}
          statusText={activeCallEvent.statusText}
        />
      ) : null}
      {currentView === 'call' ? (
        <CallScreen
          onExit={exitCallToMenu}
          showMissionDecision={showMissionDecision}
          onAcceptMission={handleAcceptMission}
          onDenyMission={handleDenyMission}
          onNarrationStart={handleNarrationStart}
          callEventData={activeCallEvent}
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
          masterContacts={contactsByPlayer[masterSelectedPlayer] ?? []}
          onTriggerCallForPlayer={handleMasterTriggerCall}
          onTriggerImageForPlayer={handleMasterTriggerImage}
        />
      ) : null}
      {currentView === 'npcs' ? (
        <NpcsPanel
          onBack={openMenu}
          onOpenCall={handleOpenContactEvent}
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
          campaignId={sessionConfig.campaignId}
          playerId={currentPlayerId}
          role={sessionConfig.role}
          onSendQueuedMission={(mission, targetPlayerId) => handleMasterOfferMission(targetPlayerId, mission)}
          onRemoveDeniedMission={handleRemoveDeniedMission}
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
      {showMissionPopup && pendingMissionOffer ? (
        <div className="mission-popup-overlay" onClick={() => setShowMissionPopup(false)}>
          <div className="mission-popup-card" onClick={(event) => event.stopPropagation()}>
            <div className="mission-popup-header">
              <div className="mission-popup-title">Nova Missao</div>
              <button className="mission-popup-close" onClick={() => setShowMissionPopup(false)}>
                FECHAR
              </button>
            </div>
            <div className="mission-popup-body">
              <div className="mission-popup-line mission-popup-title-text">{pendingMissionOffer.title}</div>
              {pendingMissionOffer.summary ? (
                <div className="mission-popup-line">{pendingMissionOffer.summary}</div>
              ) : null}
              {pendingMissionOffer.npc ? (
                <div className="mission-popup-meta">NPC: {pendingMissionOffer.npc}</div>
              ) : null}
              {pendingMissionOffer.clue ? (
                <div className="mission-popup-meta">Pista: {pendingMissionOffer.clue}</div>
              ) : null}
              {pendingMissionOffer.attachments?.length ? (
                <div className="mission-popup-attachments">
                  {pendingMissionOffer.attachments.map((att, index) => {
                    const type = (att.type || '').toLowerCase();
                    if (type === 'imagem' || type === 'image') {
                      return (
                        <div key={`${att.url}-${index}`} className="mission-popup-attachment">
                          {att.label ? <div className="mission-popup-attachment-label">{att.label}</div> : null}
                          <img
                            src={att.url}
                            alt={att.label || 'Anexo'}
                            className="mission-popup-attachment-image"
                          />
                        </div>
                      );
                    }
                    if (type === 'audio') {
                      return (
                        <div key={`${att.url}-${index}`} className="mission-popup-attachment">
                          {att.label ? <div className="mission-popup-attachment-label">{att.label}</div> : null}
                          <audio controls src={att.url} className="mission-popup-attachment-audio" />
                        </div>
                      );
                    }
                    return (
                      <a
                        key={`${att.url}-${index}`}
                        className="mission-popup-attachment"
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        [{att.type || 'anexo'}] {att.label || att.url}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="mission-popup-actions">
              <button className="mission-action-btn complete" onClick={handleAcceptMission}>
                ACEITAR
              </button>
              <button className="mission-action-btn delete" onClick={handleDenyMission}>
                NEGAR
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
