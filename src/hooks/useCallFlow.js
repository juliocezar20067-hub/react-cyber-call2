import { useCallback, useState } from 'react';

export default function useCallFlow() {
  const [currentView, setCurrentView] = useState('incoming');

  const answerCall = useCallback(() => setCurrentView('call'), []);
  const openIncoming = useCallback(() => setCurrentView('incoming'), []);
  const exitCallToMenu = useCallback(() => setCurrentView('menu'), []);
  const openNpcs = useCallback(() => setCurrentView('npcs'), []);
  const openLocations = useCallback(() => setCurrentView('locations'), []);
  const openMissions = useCallback(() => setCurrentView('missions'), []);
  const openDocuments = useCallback(() => setCurrentView('documents'), []);
  const openInventory = useCallback(() => setCurrentView('inventory'), []);
  const openShop = useCallback(() => setCurrentView('shop'), []);
  const openCharacterProfile = useCallback(() => setCurrentView('characterProfile'), []);
  const openMenu = useCallback(() => setCurrentView('menu'), []);
  const openCall = useCallback(() => setCurrentView('call'), []);

  return {
    currentView,
    answerCall,
    openIncoming,
    exitCallToMenu,
    openNpcs,
    openLocations,
    openMissions,
    openDocuments,
    openInventory,
    openShop,
    openCharacterProfile,
    openMenu,
    openCall,
  };
}
