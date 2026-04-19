import axios from "axios";

const TOKEN_KEY = "transfera_token";
const CACHE_TTL_MS = 5 * 60 * 1000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "";

const api = axios.create({
  baseURL: API_BASE_URL,
});

const memoryCache = {
  teamById: new Map(),
  playerById: new Map(),
  leagueTeams: new Map(),
  leaguePlayers: new Map(),
};

export const KNOWN_LEAGUES = [
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
];

function extractTeamLeagueName(team, fallbackLeague = null) {
  return (
    team?.league ||
    team?.currentSeason?.league?.name ||
    team?.activeSeasons?.find((season) => season?.league?.name)?.league?.name ||
    fallbackLeague ||
    null
  );
}

function normalizeResolvedPlayer(player, fallbackLeague = null) {
  const leagueName =
    player?.team?.league ||
    player?.league ||
    player?.team?.currentSeason?.league?.name ||
    fallbackLeague ||
    null;

  return {
    ...player,
    league: leagueName,
    team: player?.team
      ? {
          ...player.team,
          league: extractTeamLeagueName(player.team, leagueName),
        }
      : player?.team,
  };
}

function getLeagueMetaCacheKey(leagueName) {
  return `transfera_league_meta_${leagueName}`;
}

function getLeagueTeamsCacheKey(leagueName) {
  return `transfera_league_teams_${leagueName}`;
}

function getLeaguePlayersCacheKey(leagueName) {
  return `transfera_league_players_${leagueName}`;
}

function getValidCacheEntry(store, key) {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt > Date.now()) {
    return entry;
  }

  store.delete(key);
  return null;
}

function setMemoryCache(store, key, data) {
  store.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return data;
}

function readLocalStorageJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeLocalStorageJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("transfera_user");
}

function shouldHandleAuthError(error) {
  const status = error?.response?.status;
  const authHeader =
    error?.config?.headers?.Authorization || error?.config?.headers?.authorization;

  return status === 401 && Boolean(authHeader);
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

export function normalizeStoredUser(user) {
  if (!user) {
    return null;
  }

  const resolvedId = user.id || user._id || null;
  const favorites = user.favorites || {};
  const notificationPreferences = user.notificationPreferences || {};

  return {
    ...user,
    id: resolvedId != null ? String(resolvedId) : null,
    favorites: {
      players: Array.isArray(favorites.players) ? favorites.players : [],
      teams: Array.isArray(favorites.teams) ? favorites.teams : [],
    },
    notificationPreferences: {
      transferUpdates: notificationPreferences.transferUpdates ?? true,
      matchAlerts: notificationPreferences.matchAlerts ?? true,
      newsletter: notificationPreferences.newsletter ?? false,
    },
  };
}

export function getCurrentUserId(user = storage.getUser()) {
  const resolvedId = user?.id || user?._id || null;
  return resolvedId != null ? String(resolvedId) : null;
}

export async function resolveLeagueMeta(leagueName) {
  if (!leagueName) {
    return null;
  }

  const cacheKey = getLeagueMetaCacheKey(leagueName);
  const cached = readLocalStorageJson(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { data } = await api.get(
      `/teams/league-meta?league=${encodeURIComponent(leagueName)}`
    );
    if (data?.imagePath || data?.name || data?.id) {
      writeLocalStorageJson(cacheKey, data);
      return data;
    }
  } catch {
    return null;
  }

  return null;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldHandleAuthError(error)) {
      clearAuthStorage();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export const storage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  getUser() {
    const parsed = readLocalStorageJson("transfera_user");
    if (!parsed) {
      return null;
    }

    return normalizeStoredUser(parsed);
  },
  setUser(user) {
    writeLocalStorageJson("transfera_user", normalizeStoredUser(user));
  },
  clearUser() {
    localStorage.removeItem("transfera_user");
  },
};

export function updateStoredUserFavorites(targetType, itemId, isAdding) {
  const currentUser = storage.getUser();
  if (!currentUser?.id) {
    return null;
  }

  const favoriteKey = targetType === "team" ? "teams" : "players";
  const currentFavorites = currentUser.favorites || {};
  const currentIds = Array.isArray(currentFavorites[favoriteKey])
    ? currentFavorites[favoriteKey]
    : [];
  const normalizedId = Number(itemId);
  const nextIds = isAdding
    ? currentIds.some((id) => Number(id) === normalizedId)
      ? currentIds
      : [...currentIds, itemId]
    : currentIds.filter((id) => Number(id) !== normalizedId);

  const nextUser = normalizeStoredUser({
    ...currentUser,
    favorites: {
      ...currentFavorites,
      [favoriteKey]: nextIds,
    },
  });

  storage.setUser(nextUser);
  return nextUser;
}

export async function fetchLeagueTeams(leagueName, { forceRefresh = false } = {}) {
  if (!leagueName) {
    return [];
  }

  const cacheKey = String(leagueName);
  if (!forceRefresh) {
    const cachedMemoryEntry = getValidCacheEntry(memoryCache.leagueTeams, cacheKey);
    if (cachedMemoryEntry) {
      return cachedMemoryEntry.data;
    }

    const cachedTeams = readLocalStorageJson(getLeagueTeamsCacheKey(leagueName));
    if (cachedTeams) {
      return setMemoryCache(memoryCache.leagueTeams, cacheKey, cachedTeams);
    }
  }

  const { data } = await api.get(`/teams?league=${encodeURIComponent(leagueName)}&limit=100`);
  const teams = data?.data || [];
  writeLocalStorageJson(getLeagueTeamsCacheKey(leagueName), teams);
  return setMemoryCache(memoryCache.leagueTeams, cacheKey, teams);
}

export async function fetchLeaguePlayers(
  leagueName,
  { limit = 1000, forceRefresh = false } = {}
) {
  if (!leagueName) {
    return [];
  }

  const cacheKey = `${leagueName}:${limit}`;
  if (!forceRefresh) {
    const cachedMemoryEntry = getValidCacheEntry(memoryCache.leaguePlayers, cacheKey);
    if (cachedMemoryEntry) {
      return cachedMemoryEntry.data;
    }

    if (limit >= 1000) {
      const cachedPlayers = readLocalStorageJson(getLeaguePlayersCacheKey(leagueName));
      if (cachedPlayers) {
        return setMemoryCache(memoryCache.leaguePlayers, cacheKey, cachedPlayers);
      }
    }
  }

  const { data } = await api.get(
    `/players?league=${encodeURIComponent(leagueName)}&limit=${limit}`
  );
  const players = data?.data || [];

  if (limit >= 1000) {
    writeLocalStorageJson(getLeaguePlayersCacheKey(leagueName), players);
  }

  return setMemoryCache(memoryCache.leaguePlayers, cacheKey, players);
}

export async function resolveTeamLeague(teamId) {
  if (!teamId) {
    return null;
  }

  for (const league of KNOWN_LEAGUES) {
    try {
      const teams = await fetchLeagueTeams(league);
      const match = (teams || []).find((team) => Number(team.id) === Number(teamId));
      if (match) {
        return extractTeamLeagueName(match, league);
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function resolveTeamById(teamId) {
  if (!teamId) {
    return null;
  }

  const cacheKey = String(teamId);
  const cachedTeam = getValidCacheEntry(memoryCache.teamById, cacheKey);
  if (cachedTeam) {
    return cachedTeam.data;
  }

  for (const league of KNOWN_LEAGUES) {
    const cachedTeams = readLocalStorageJson(getLeagueTeamsCacheKey(league));
    const cachedMatch = (cachedTeams || []).find((team) => Number(team.id) === Number(teamId));
    if (cachedMatch) {
      return setMemoryCache(memoryCache.teamById, cacheKey, {
        ...cachedMatch,
        league: extractTeamLeagueName(cachedMatch, league),
      });
    }
  }

  let directTeam = null;

  try {
    const { data } = await api.get(`/teams/${teamId}`);
    directTeam = data?.team || null;

    if (
      directTeam?.name &&
      !/^Takım #\d+$/i.test(directTeam.name) &&
      !/^Takim #\d+$/i.test(directTeam.name)
    ) {
      return setMemoryCache(memoryCache.teamById, cacheKey, {
        ...directTeam,
        league: extractTeamLeagueName(directTeam),
      });
    }
  } catch {
    directTeam = null;
  }

  const leagueName = await resolveTeamLeague(teamId);

  if (leagueName) {
    try {
      const teams = await fetchLeagueTeams(leagueName);
      const match = (teams || []).find((team) => Number(team.id) === Number(teamId));

      if (match) {
        return setMemoryCache(memoryCache.teamById, cacheKey, {
          ...match,
          league: extractTeamLeagueName(match, leagueName),
        });
      }
    } catch {
      // fallback below
    }
  }

  if (directTeam) {
    return setMemoryCache(memoryCache.teamById, cacheKey, {
      ...directTeam,
      league: extractTeamLeagueName(directTeam, leagueName),
    });
  }

  return setMemoryCache(memoryCache.teamById, cacheKey, {
    id: Number(teamId),
    name: `Takım #${teamId}`,
    league: leagueName || null,
  });
}

export async function resolvePlayerById(playerId) {
  if (!playerId) {
    return null;
  }

  const cacheKey = String(playerId);
  const cachedPlayer = getValidCacheEntry(memoryCache.playerById, cacheKey);
  if (cachedPlayer) {
    return cachedPlayer.data;
  }

  const { data } = await api.get(`/players/${playerId}`);
  return setMemoryCache(
    memoryCache.playerById,
    cacheKey,
    normalizeResolvedPlayer(data?.player)
  );
}

export default api;
