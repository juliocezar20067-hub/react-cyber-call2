import { useEffect, useMemo, useState } from 'react';
import { CALLER_NAME, CONNECTION_CODE } from '../../constants/ui';
import { playSound } from '../../sound/soundSystem';
import { getStoredState, setStoredState } from '../../lib/stateStorage';
import CharacterSheet from './CharacterSheet';
import './Menu.css';

export default function MainMenu({
  onOpenLocations,
  onOpenMissions,
  onOpenInventory,
  onOpenShop,
  onOpenCombat,
  onOpenDocuments,
  onOpenNpcs,
  onOpenCharacterProfile,
  activeMission,
  completedMissions,
  deniedMissions,
  onCompleteMission,
  onDeleteMission,
  onUpdateMission,
  campaignId,
  playerId,
  role,
  players,
  selectedPlayer,
  onSelectPlayer,
  allTracking,
  masterContacts,
  onTriggerCallForPlayer,
  onTriggerImageForPlayer,
  joinRequests,
  onAcceptJoinRequest,
  onDenyJoinRequest,
  campaignBackground,
  onSaveCampaignBackground,
}) {
  const [isEditingMission, setIsEditingMission] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editClue, setEditClue] = useState('');
  const [showImageTriggerForm, setShowImageTriggerForm] = useState(false);
  const [imageUrlToTrigger, setImageUrlToTrigger] = useState('');
  const [imageTitleToTrigger, setImageTitleToTrigger] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [savedImages, setSavedImages] = useState([]);
  const [imagesHydrated, setImagesHydrated] = useState(false);
  const [showBackgroundEditor, setShowBackgroundEditor] = useState(false);
  const [backgroundInput, setBackgroundInput] = useState('');
  const [backgroundDim, setBackgroundDim] = useState('0');
  const [backgroundBlur, setBackgroundBlur] = useState('0');
  const pendingRequests = Array.isArray(joinRequests) ? joinRequests : [];

  useEffect(() => {
    if (!activeMission) {
      setIsEditingMission(false);
      setEditTitle('');
      setEditSummary('');
      setEditClue('');
      return;
    }

    setEditTitle(activeMission.title ?? '');
    setEditSummary(activeMission.summary ?? '');
    setEditClue(activeMission.clue ?? '');
  }, [activeMission]);

  useEffect(() => {
    if (role !== 'master' || !campaignId) {
      setSavedImages([]);
      setImagesHydrated(false);
      return;
    }

    let cancelled = false;
    getStoredState({
      campaignId,
      playerId: 'master',
      scope: 'master_image_library',
      fallback: [],
    }).then((data) => {
      if (cancelled) return;
      if (!Array.isArray(data)) {
        setSavedImages([]);
        setImagesHydrated(true);
      } else {
        setSavedImages(data);
        setImagesHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [campaignId, role]);

  useEffect(() => {
    const firstContactId = masterContacts?.[0]?.id ?? '';
    if (!masterContacts?.length) {
      setSelectedContactId('');
      return;
    }

    if (!masterContacts.some((contact) => contact.id === selectedContactId)) {
      setSelectedContactId(firstContactId);
    }
  }, [masterContacts, selectedContactId]);

  useEffect(() => {
    if (role !== 'master' || !campaignId || !imagesHydrated) return;
    setStoredState({
      campaignId,
      playerId: 'master',
      scope: 'master_image_library',
      data: savedImages,
    });
  }, [campaignId, imagesHydrated, role, savedImages]);

  const globalActiveList = useMemo(() => {
    if (role !== 'master') return [];

    return players
      .map((name) => ({ player: name, mission: allTracking?.[name]?.active ?? null }))
      .filter((item) => item.mission);
  }, [allTracking, players, role]);

  const handleOpenLocations = () => {
    playSound('button');
    onOpenLocations();
  };

  const handleOpenMissions = () => {
    playSound('button');
    onOpenMissions();
  };

  const handleOpenInventory = () => {
    playSound('button');
    onOpenInventory();
  };

  const handleOpenDocuments = () => {
    playSound('button');
    onOpenDocuments();
  };

  const handleOpenShop = () => {
    playSound('button');
    onOpenShop();
  };

  const handleOpenCombat = () => {
    playSound('button');
    onOpenCombat();
  };

  const handleOpenNpcs = () => {
    playSound('button');
    onOpenNpcs();
  };

  const handleOpenCharacterProfile = () => {
    playSound('button');
    onOpenCharacterProfile();
  };

  const handleStartEdit = () => {
    playSound('button');
    setIsEditingMission(true);
  };

  const handleCancelEdit = () => {
    playSound('button');
    setIsEditingMission(false);
    setEditTitle(activeMission?.title ?? '');
    setEditSummary(activeMission?.summary ?? '');
    setEditClue(activeMission?.clue ?? '');
  };

  const handleSaveEdit = () => {
    if (!activeMission) return;
    onUpdateMission({
      title: editTitle.trim() || activeMission.title,
      summary: editSummary.trim() || activeMission.summary,
      clue: editClue.trim() || activeMission.clue,
    });
    setIsEditingMission(false);
  };

  const handleMasterSelectPlayer = (player) => {
    playSound('button');
    onSelectPlayer(player);
  };

  const handleTriggerForSelectedPlayer = () => {
    if (!selectedPlayer || !selectedContactId) return;
    const selectedContact = masterContacts.find((contact) => contact.id === selectedContactId);
    if (!selectedContact) return;
    onTriggerCallForPlayer?.(selectedPlayer, selectedContact);
  };

  const handleTriggerImageForSelectedPlayer = () => {
    if (!selectedPlayer || !imageUrlToTrigger.trim()) return;
    playSound('button');
    const normalizedImage = {
      imageUrl: imageUrlToTrigger.trim(),
      title: imageTitleToTrigger.trim() || 'Imagem sem titulo',
    };
    onTriggerImageForPlayer?.({
      targetPlayerId: selectedPlayer,
      imageUrl: normalizedImage.imageUrl,
      title: imageTitleToTrigger.trim(),
    });
    setSavedImages((prev) => {
      if (prev.some((image) => image.imageUrl === normalizedImage.imageUrl)) {
        return prev;
      }
      return [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          ...normalizedImage,
        },
        ...prev,
      ];
    });
    setImageUrlToTrigger('');
    setImageTitleToTrigger('');
    setShowImageTriggerForm(false);
  };

  const handleToggleImageForm = () => {
    playSound('button');
    setShowImageTriggerForm((prev) => !prev);
  };

  const handleOpenBackgroundEditor = () => {
    playSound('button');
    setBackgroundInput(campaignBackground?.url || '');
    setBackgroundDim(String(campaignBackground?.dim ?? 0));
    setBackgroundBlur(String(campaignBackground?.blur ?? 0));
    setShowBackgroundEditor(true);
  };

  const handleCloseBackgroundEditor = () => {
    playSound('button');
    setShowBackgroundEditor(false);
  };

  const handleSaveBackground = () => {
    onSaveCampaignBackground?.({
      url: backgroundInput.trim(),
      dim: Number(backgroundDim) || 0,
      blur: Number(backgroundBlur) || 0,
    });
    setShowBackgroundEditor(false);
  };

  const handleSaveImagePreset = () => {
    if (!imageUrlToTrigger.trim()) return;
    playSound('button');
    setSavedImages((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        imageUrl: imageUrlToTrigger.trim(),
        title: imageTitleToTrigger.trim() || 'Imagem sem titulo',
      },
      ...prev,
    ]);
    setImageUrlToTrigger('');
    setImageTitleToTrigger('');
    setShowImageTriggerForm(false);
  };

  const handleSendSavedImage = (image) => {
    if (!selectedPlayer) return;
    playSound('button');
    onTriggerImageForPlayer?.({
      targetPlayerId: selectedPlayer,
      imageUrl: image.imageUrl,
      title: image.title,
    });
  };

  const handleDeleteSavedImage = (imageId) => {
    playSound('button');
    setSavedImages((prev) => prev.filter((image) => image.id !== imageId));
  };

  return (
    <div className="menu-layout">
      {role === 'master' ? (
        <>
          <button className="master-bg-btn" onClick={handleOpenBackgroundEditor}>
            FUNDO
          </button>
          {showBackgroundEditor ? (
            <div className="master-image-overlay" onClick={handleCloseBackgroundEditor}>
              <div className="master-image-modal" onClick={(event) => event.stopPropagation()}>
                <div className="master-image-title">Trocar background</div>
                <input
                  className="entry-input"
                  placeholder="Link da imagem ou GIF"
                  value={backgroundInput}
                  onChange={(event) => setBackgroundInput(event.target.value)}
                />
                {backgroundInput.trim() ? (
                  <img
                    className="background-preview"
                    src={backgroundInput.trim()}
                    alt="Preview do background"
                  />
                ) : (
                  <div className="placeholder-box">Cole um link para ver o preview.</div>
                )}
                <div className="background-control">
                  <label className="background-control-label">
                    Escurecer fundo: {Number(backgroundDim || 0).toFixed(2)}
                  </label>
                  <input
                    className="background-control-range"
                    type="range"
                    min="0"
                    max="0.85"
                    step="0.05"
                    value={backgroundDim}
                    onChange={(event) => setBackgroundDim(event.target.value)}
                  />
                </div>
                <div className="background-control">
                  <label className="background-control-label">
                    Blur: {Number(backgroundBlur || 0)}px
                  </label>
                  <input
                    className="background-control-range"
                    type="range"
                    min="0"
                    max="12"
                    step="1"
                    value={backgroundBlur}
                    onChange={(event) => setBackgroundBlur(event.target.value)}
                  />
                </div>
                <div className="master-image-trigger-actions">
                  <button className="master-trigger-btn" onClick={handleSaveBackground}>
                    SALVAR
                  </button>
                  <button
                    className="master-trigger-btn secondary"
                    onClick={() => onSaveCampaignBackground?.({ url: '', dim: 0, blur: 0 })}
                  >
                    LIMPAR FUNDO
                  </button>
                  <button className="master-trigger-btn secondary" onClick={handleCloseBackgroundEditor}>
                    FECHAR
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      <div className="mission-side-column">
        <div className="active-mission-block out-of-menu">
          <div className="active-mission-label">Missao Atual</div>
          {activeMission ? (
            <>
              {isEditingMission ? (
                <div className="mission-edit-form">
                  <input
                    className="mission-edit-input"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Titulo"
                  />
                  <input
                    className="mission-edit-input"
                    value={editSummary}
                    onChange={(event) => setEditSummary(event.target.value)}
                    placeholder="Resumo"
                  />
                  <input
                    className="mission-edit-input"
                    value={editClue}
                    onChange={(event) => setEditClue(event.target.value)}
                    placeholder="Pista"
                  />
                </div>
              ) : (
                <>
                  <div className="active-mission-title">{activeMission.title}</div>
                  <div className="active-mission-player">NPC: {activeMission.npc}</div>
                  <div className="active-mission-meta">{activeMission.summary}</div>
                  <div className="active-mission-meta">{activeMission.clue}</div>
                </>
              )}
              <div className="active-mission-actions">
                <button className="mission-action-btn complete" onClick={onCompleteMission}>
                  CONCLUIR
                </button>
                <button className="mission-action-btn delete" onClick={onDeleteMission}>
                  EXCLUIR
                </button>
                {isEditingMission ? (
                  <>
                    <button className="mission-action-btn edit" onClick={handleSaveEdit}>
                      SALVAR
                    </button>
                    <button className="mission-action-btn edit" onClick={handleCancelEdit}>
                      CANCELAR
                    </button>
                  </>
                ) : (
                  <button className="mission-action-btn edit" onClick={handleStartEdit}>
                    EDITAR
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="active-mission-empty">Nenhuma missao aceita.</div>
          )}
        </div>

        <div className="active-mission-block out-of-menu">
          <div className="active-mission-label">Missoes Concluidas</div>
          {completedMissions.length > 0 ? (
            completedMissions.map((mission, index) => (
              <div className="mission-history-item" key={`completed-${mission.title}-${index}`}>
                {mission.title}
              </div>
            ))
          ) : (
            <div className="active-mission-empty">Nenhuma.</div>
          )}
        </div>

        <div className="active-mission-block out-of-menu">
          <div className="active-mission-label">Missoes Negadas</div>
          {deniedMissions.length > 0 ? (
            deniedMissions.map((mission, index) => (
              <div className="mission-history-item" key={`denied-${mission.title}-${index}`}>
                {mission.title}
              </div>
            ))
          ) : (
            <div className="active-mission-empty">Nenhuma.</div>
          )}
        </div>
      </div>

      <div className="menu-shell">
        <div className="terminal-bar">
          <span>TERMINAL/{campaignId}</span>
          <span>USER:{role === 'master' ? `MASTER (${playerId})` : playerId}</span>
          <span>STATUS:ONLINE</span>
        </div>

        {role === 'master' ? (
          <div className="master-tools">
            <div className="master-label">Visao do Mestre</div>
            <div className="master-player-tabs">
              {players.map((player) => (
                <button
                  key={player}
                  className={`player-tab ${selectedPlayer === player ? 'is-active' : ''}`}
                  onClick={() => handleMasterSelectPlayer(player)}
                >
                  {player}
                </button>
              ))}
            </div>
            <div className="master-active-list">
              {globalActiveList.length > 0 ? (
                globalActiveList.map((item) => (
                  <div key={`${item.player}-${item.mission.title}`} className="mission-history-item">
                    {item.player}: {item.mission.title}
                  </div>
                ))
              ) : (
                <div className="active-mission-empty">Nenhuma missao ativa no momento.</div>
              )}
            </div>
            <button className="master-trigger-btn" onClick={handleTriggerForSelectedPlayer}>
              DISPARAR LIGACAO PARA {selectedPlayer}
            </button>
            <select
              className="entry-input"
              value={selectedContactId}
              onChange={(event) => {
                playSound('button');
                setSelectedContactId(event.target.value);
              }}
            >
              <option value="">Selecione o contato da ligacao</option>
              {(masterContacts ?? []).map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
            <button className="master-trigger-btn" onClick={handleToggleImageForm}>
              DISPARAR IMAGEM
            </button>
            {savedImages.length > 0 ? (
              <div className="master-image-library">
                <div className="master-image-library-title">Imagens Salvas</div>
                <div className="master-image-library-list">
                  {savedImages.map((image) => (
                    <div className="master-image-library-item" key={image.id}>
                      <div className="master-image-library-name">{image.title}</div>
                      <div className="master-image-library-actions">
                        <button className="master-trigger-btn" onClick={() => handleSendSavedImage(image)}>
                          ENVIAR PARA {selectedPlayer}
                        </button>
                        <button className="master-trigger-btn secondary" onClick={() => handleDeleteSavedImage(image.id)}>
                          EXCLUIR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {showImageTriggerForm ? (
              <div className="master-image-overlay" onClick={handleToggleImageForm}>
                <div className="master-image-modal" onClick={(event) => event.stopPropagation()}>
                  <div className="master-image-title">Disparar Imagem</div>
                  <input
                    className="entry-input"
                    placeholder="Link da imagem para o player"
                    value={imageUrlToTrigger}
                    onChange={(event) => setImageUrlToTrigger(event.target.value)}
                  />
                  <input
                    className="entry-input"
                    placeholder="Titulo (opcional)"
                    value={imageTitleToTrigger}
                    onChange={(event) => setImageTitleToTrigger(event.target.value)}
                  />
                  <div className="master-image-trigger-actions">
                    <button className="master-trigger-btn" onClick={handleTriggerImageForSelectedPlayer}>
                      ENVIAR PARA {selectedPlayer}
                    </button>
                    <button className="master-trigger-btn secondary" onClick={handleSaveImagePreset}>
                      SALVAR IMAGEM
                    </button>
                    <button className="master-trigger-btn secondary" onClick={handleToggleImageForm}>
                      CANCELAR
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="master-image-library">
              <div className="master-image-library-title">Solicitacoes de acesso</div>
              {pendingRequests.length > 0 ? (
                <div className="master-image-library-list">
                  {pendingRequests.map((request) => (
                    <div className="master-image-library-item" key={request.id ?? request.username}>
                      <div className="master-image-library-name">{request.username}</div>
                      <div className="master-image-library-actions">
                        <button
                          className="master-trigger-btn"
                          onClick={() => onAcceptJoinRequest?.(request)}
                        >
                          ACEITAR
                        </button>
                        <button
                          className="master-trigger-btn secondary"
                          onClick={() => onDenyJoinRequest?.(request)}
                        >
                          NEGAR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="active-mission-empty">Nenhuma solicitacao pendente.</div>
              )}
            </div>
          </div>
        ) : null}

        <h2 className="menu-title">SISTEMA RED</h2>
        <div className="menu-grid">
          <button className="menu-card" onClick={handleOpenLocations}>
            <span className="menu-card-title">Mapa Tatico</span>
            <span className="menu-card-subtitle">Mapeamento de pontos-chave</span>
          </button>

          <button className="menu-card" onClick={handleOpenMissions}>
            <span className="menu-card-title">Missoes</span>
            <span className="menu-card-subtitle">Ativas, concluidas e negadas</span>
          </button>

          <button className="menu-card" onClick={handleOpenInventory}>
            <span className="menu-card-title">Inventario</span>
            <span className="menu-card-subtitle">Itens e recursos do operador</span>
          </button>

          <button className="menu-card" onClick={handleOpenShop}>
            <span className="menu-card-title">Loja</span>
            <span className="menu-card-subtitle">Catalogo e precos oficiais</span>
          </button>

          <button className="menu-card" onClick={handleOpenCombat}>
            <span className="menu-card-title">Combate</span>
            <span className="menu-card-subtitle">Arena tática em tempo real</span>
          </button>

          <button className="menu-card" onClick={handleOpenDocuments}>
            <span className="menu-card-title">Documentos</span>
            <span className="menu-card-subtitle">Arquivos e evidencias da operacao</span>
          </button>

          <button className="menu-card" onClick={handleOpenNpcs}>
            <span className="menu-card-title">Contatos</span>
            <span className="menu-card-subtitle">Contatos e ligacoes ativas</span>
          </button>
        </div>

        <div className="menu-footer">
          ULTIMO CONTATO: {CALLER_NAME} | {CONNECTION_CODE}
        </div>
      </div>

      <div className="character-side-column">
        <CharacterSheet onOpenProfile={handleOpenCharacterProfile} />
      </div>

    </div>
  );
}
