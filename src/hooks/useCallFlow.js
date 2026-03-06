import { useState } from 'react';

export default function useCallFlow() {
  const [currentView, setCurrentView] = useState('incoming');

  const answerCall = () => setCurrentView('call');
  const exitCallToMenu = () => setCurrentView('menu');
  const openNpcs = () => setCurrentView('npcs');
  const openLocations = () => setCurrentView('locations');
  const openMenu = () => setCurrentView('menu');
  const openCall = () => setCurrentView('call');

  return {
    currentView,
    answerCall,
    exitCallToMenu,
    openNpcs,
    openLocations,
    openMenu,
    openCall,
  };
}
