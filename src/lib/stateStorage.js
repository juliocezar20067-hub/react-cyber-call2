const LOCAL_PREFIX = 'rc_state_v1';

function localStateKey(campaignId, playerId, scope) {
  return `${LOCAL_PREFIX}:${campaignId}:${playerId}:${scope}`;
}

const inMemoryState = new Map();

function cloudEnabled() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

async function readFromCloud(campaignId, playerId, scope) {
  if (!cloudEnabled()) return null;

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/app_state`);
  url.searchParams.set('select', 'data');
  url.searchParams.set('campaign_id', `eq.${campaignId}`);
  url.searchParams.set('player_id', `eq.${playerId}`);
  url.searchParams.set('scope', `eq.${scope}`);
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  return json?.[0]?.data ?? null;
}

async function writeToCloud(campaignId, playerId, scope, data) {
  if (!cloudEnabled()) return;

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/app_state`);
  url.searchParams.set('on_conflict', 'campaign_id,player_id,scope');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([
      {
        campaign_id: campaignId,
        player_id: playerId,
        scope,
        data,
      },
    ]),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase write failed (${response.status}): ${body}`);
  }
}

export async function getStoredState({ campaignId, playerId, scope, fallback }) {
  const key = localStateKey(campaignId, playerId, scope);

  if (!cloudEnabled()) {
    return inMemoryState.has(key) ? inMemoryState.get(key) : fallback;
  }

  try {
    const cloudData = await readFromCloud(campaignId, playerId, scope);
    if (cloudData != null) {
      return cloudData;
    }
  } catch {
    // Ignore cloud errors and keep app running offline.
  }

  return fallback;
}

export async function storedStateExists({ campaignId, playerId, scope }) {
  const key = localStateKey(campaignId, playerId, scope);

  if (!cloudEnabled()) {
    return inMemoryState.has(key);
  }

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/app_state`);
  url.searchParams.set('select', 'id');
  url.searchParams.set('campaign_id', `eq.${campaignId}`);
  url.searchParams.set('player_id', `eq.${playerId}`);
  url.searchParams.set('scope', `eq.${scope}`);
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Falha ao consultar Supabase (${response.status}): ${text || 'erro desconhecido'}`);
  }

  const json = await response.json();
  return Array.isArray(json) && json.length > 0;
}

export function setStoredState({ campaignId, playerId, scope, data }) {
  const key = localStateKey(campaignId, playerId, scope);
  inMemoryState.set(key, data);

  writeToCloud(campaignId, playerId, scope, data).catch(() => {
    // Ignore cloud write errors; local state remains source of truth offline.
    // In development we still log so integration issues are visible.
    if (import.meta.env.DEV) {
      console.warn('Supabase write failed for scope:', scope);
    }
  });
}

export function subscribeStoredState({
  campaignId,
  playerId,
  scope,
  onChange,
  fallback = null,
  intervalMs = 1200,
}) {
  let disposed = false;
  let lastSerialized = null;

  const tick = async () => {
    if (disposed) return;
    const data = await getStoredState({ campaignId, playerId, scope, fallback });
    const serialized = JSON.stringify(data ?? null);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    onChange(data ?? fallback);
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  return () => {
    disposed = true;
    clearInterval(timer);
  };
}

export function isCloudConfigured() {
  return cloudEnabled();
}

export async function testCloudConnection() {
  if (!cloudEnabled()) {
    return {
      ok: false,
      message: 'Variaveis do Supabase nao configuradas.',
    };
  }

  try {
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/app_state`);
    url.searchParams.set('select', 'id');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        message: `Erro ${response.status}: ${text || 'falha na consulta'}`,
      };
    }

    return {
      ok: true,
      message: 'Conexao com Supabase OK.',
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Falha de rede.',
    };
  }
}
