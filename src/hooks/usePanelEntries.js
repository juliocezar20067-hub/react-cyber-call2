import { useEffect, useRef, useState } from 'react';
import { getStoredState, setStoredState } from '../lib/stateStorage';

function normalizeEntries(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: entry.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...entry,
    }));
}

export default function usePanelEntries({ campaignId, playerId, panelId, defaultEntries = [] }) {
  const [entries, setEntries] = useState([]);
  const defaultEntriesRef = useRef(defaultEntries);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    defaultEntriesRef.current = defaultEntries;
  }, [defaultEntries]);

  useEffect(() => {
    if (!campaignId || !playerId || !panelId) {
      setEntries([]);
      setHydrated(false);
      return;
    }

    let cancelled = false;
    getStoredState({
      campaignId,
      playerId,
      scope: `panel_entries:${panelId}`,
      fallback: defaultEntriesRef.current,
    }).then((data) => {
      if (cancelled) return;
      setEntries(normalizeEntries(data, defaultEntriesRef.current));
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [campaignId, panelId, playerId]);

  useEffect(() => {
    if (!campaignId || !playerId || !panelId || !hydrated) return;
    setStoredState({
      campaignId,
      playerId,
      scope: `panel_entries:${panelId}`,
      data: entries,
    });
  }, [campaignId, entries, hydrated, panelId, playerId]);

  const addEntry = (entry) => {
    const prepared = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      ...entry,
    };
    setEntries((prev) => [prepared, ...prev]);
  };

  const removeEntry = (entryId) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  return { entries, addEntry, removeEntry };
}
