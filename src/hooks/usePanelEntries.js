import { useEffect, useMemo, useState } from 'react';

const PANEL_ENTRIES_PREFIX = 'rc_panel_entries_v1';

function createStorageKey(campaignId, playerId, panelId) {
  return `${PANEL_ENTRIES_PREFIX}:${campaignId}:${playerId}:${panelId}`;
}

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

  const storageKey = useMemo(() => {
    if (!campaignId || !playerId || !panelId) {
      return null;
    }
    return createStorageKey(campaignId, playerId, panelId);
  }, [campaignId, panelId, playerId]);

  useEffect(() => {
    if (!storageKey) {
      setEntries([]);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setEntries(defaultEntries);
        return;
      }

      const parsed = JSON.parse(raw);
      setEntries(normalizeEntries(parsed, defaultEntries));
    } catch {
      setEntries(defaultEntries);
    }
  }, [defaultEntries, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, storageKey]);

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
