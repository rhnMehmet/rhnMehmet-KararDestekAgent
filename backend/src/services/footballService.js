const axios = require("axios");
const PlayerOverride = require("../models/PlayerOverride");
const TransferOverride = require("../models/TransferOverride");
const {
  isDatabaseAvailable,
  createDatabaseUnavailableError,
} = require("../utils/database");

const LEAGUE_IDS = {
  "serie a": 384,
  ligue1: 301,
  "ligue 1": 301,
  bundesliga: 82,
  "premier lig": 8,
  "premier league": 8,
  laliga: 564,
  "la liga": 564,
};

const LEAGUE_COUNTRIES = {
  "premier league": "England",
  "premier lig": "England",
  "la liga": "Spain",
  laliga: "Spain",
  bundesliga: "Germany",
  "serie a": "Italy",
  "ligue 1": "France",
  ligue1: "France",
};

const client = axios.create({
  baseURL: process.env.SPORTMONKS_BASE_URL || "https://api.sportmonks.com/v3/football",
  timeout: Number(process.env.SPORTMONKS_TIMEOUT || 15000),
  proxy: false,
});

const seasonIdCache = new Map();
const teamsCache = new Map();
const leagueMetaCache = new Map();

function getApiToken() {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) {
    const error = new Error("SPORTMONKS_API_TOKEN tanimli degil.");
    error.statusCode = 500;
    throw error;
  }
  return token;
}

function parsePagination(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 1000);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function normalizeLeagueName(league) {
  if (!league) {
    return null;
  }

  const normalized = String(league).trim().toLowerCase();
  return normalized;
}

function inferLeagueCountry(leagueName) {
  const normalizedLeague = normalizeLeagueName(leagueName);
  return normalizedLeague ? LEAGUE_COUNTRIES[normalizedLeague] || null : null;
}

async function request(path, params = {}) {
  const response = await client.get(path, {
    params: {
      api_token: getApiToken(),
      ...params,
    },
  });

  return response.data;
}

async function requestTransferFeed(page = 1) {
  const includeOptions = [
    "player;fromteam.currentSeason.league;toteam.currentSeason.league;type",
    "player;fromteam;toteam;type",
  ];

  let lastError = null;

  for (const include of includeOptions) {
    try {
      return await request("/transfers", { include, page });
    } catch (error) {
      lastError = error;
      if (error.response?.status !== 400)  {
        throw error;
      }
    }
  }

  throw lastError;
}

async function requestAllTransferPages(maxPages = 12) {
  const allTransfers = [];
  let currentPage = 1;
  let totalPages = null;

  while (currentPage <= maxPages) {
    const payload = await requestTransferFeed(currentPage);
    const pageItems = payload.data || [];

    if (!pageItems.length) {
      break;
    }

    allTransfers.push(...pageItems);

    const paginationTotalPages =
      payload.pagination?.total_pages ||
      payload.pagination?.totalPages ||
      payload.meta?.pagination?.total_pages ||
      payload.meta?.pagination?.totalPages ||
      null;

    if (paginationTotalPages) {
      totalPages = Number(paginationTotalPages);
    }

    if ((totalPages && currentPage >= totalPages) || pageItems.length === 0) {
      break;
    }

    currentPage += 1;
  }

  return allTransfers;
}

async function requestAllTeamPages(path, params = {}, maxPages = 5) {
  const allTeams = [];
  let currentPage = 1;
  let totalPages = null;
  const perPage = Number(params.per_page || 100);

  while (currentPage <= maxPages) {
    const payload = await request(path, {
      ...params,
      page: currentPage,
      per_page: perPage,
    });
    const pageItems = payload.data || [];

    if (!pageItems.length) {
      break;
    }

    allTeams.push(...pageItems);

    const paginationTotalPages =
      payload.pagination?.total_pages ||
      payload.pagination?.totalPages ||
      payload.meta?.pagination?.total_pages ||
      payload.meta?.pagination?.totalPages ||
      null;

    if (paginationTotalPages) {
      totalPages = Number(paginationTotalPages);
    }

    if (
      (totalPages && currentPage >= totalPages) ||
      pageItems.length === 0 ||
      pageItems.length < perPage
    ) {
      break;
    }

    currentPage += 1;
  }

  return allTeams;
}

async function requestLeagueStandingsTeams(seasonId) {
  const payload = await request(`/standings/seasons/${seasonId}`, {
    include: "participant",
  });

  return (payload.data || [])
    .map((row) => row.participant)
    .filter(Boolean);
}

async function requestTeamTransfers(teamId, page = 1) {
  return request(`/transfers/teams/${teamId}`, {
    include: "player;fromteam;toteam;type",
    page,
  });
}

async function requestAllTeamTransferPages(teamId, maxPages = 12) {
  const allTransfers = [];
  let currentPage = 1;
  let totalPages = null;

  while (currentPage <= maxPages) {
    const payload = await requestTeamTransfers(teamId, currentPage);
    const pageItems = payload.data || [];

    if (!pageItems.length) {
      break;
    }

    allTransfers.push(...pageItems);

    const paginationTotalPages =
      payload.pagination?.total_pages ||
      payload.pagination?.totalPages ||
      payload.meta?.pagination?.total_pages ||
      payload.meta?.pagination?.totalPages ||
      null;

    if (paginationTotalPages) {
      totalPages = Number(paginationTotalPages);
    }

    if ((totalPages && currentPage >= totalPages) || pageItems.length === 0) {
      break;
    }

    currentPage += 1;
  }

  return allTransfers;
}

async function getLeagueSeasonId(leagueName) {
  const normalizedLeague = normalizeLeagueName(leagueName);
  const leagueId = LEAGUE_IDS[normalizedLeague];

  if (!leagueId) {
    return null;
  }

  if (seasonIdCache.has(normalizedLeague)) {
    return seasonIdCache.get(normalizedLeague);
  }

  const payload = await request(`/leagues/${leagueId}`, {
    include: "currentSeason",
  });

  const seasonId =
    payload.data?.currentseason?.id || payload.data?.currentSeason?.id || null;
  seasonIdCache.set(normalizedLeague, seasonId);
  return seasonId;
}

async function getLeagueMeta(leagueName) {
  const normalizedLeague = normalizeLeagueName(leagueName);
  const leagueId = LEAGUE_IDS[normalizedLeague];

  if (!leagueId) {
    return null;
  }

  if (leagueMetaCache.has(normalizedLeague)) {
    return leagueMetaCache.get(normalizedLeague);
  }

  const payload = await request(`/leagues/${leagueId}`);
  const meta = payload.data
    ? {
        id: payload.data.id,
        name: payload.data.name || leagueName,
        imagePath: payload.data.image_path || payload.data.logo_path || null,
      }
    : null;

  leagueMetaCache.set(normalizedLeague, meta);
  return meta;
}

function mapTeam(team) {
  const resolvedLeague =
    team.current_season?.league?.name ||
    team.active_seasons?.[0]?.league?.name ||
    null;

  return {
    id: team.id,
    name: team.name,
    shortCode: team.short_code || null,
    country: team.country?.name || team.country_name || inferLeagueCountry(resolvedLeague),
    founded: team.founded || null,
    imagePath: team.image_path || null,
    venue: team.venue?.name || null,
    league: resolvedLeague,
  };
}

function extractStatisticValue(detail, kind = "total") {
  if (!detail || !detail.value) {
    return null;
  }

  if (detail.value[kind] !== undefined && detail.value[kind] !== null) {
    return detail.value[kind];
  }

  if (detail.value.average !== undefined && detail.value.average !== null) {
    return detail.value.average;
  }

  const firstPrimitive = Object.values(detail.value).find(
    (value) => typeof value === "number" || typeof value === "string"
  );

  return firstPrimitive ?? null;
}

function parsePlayerStatistics(player, fallbackTeam = null) {
  const statistics = Array.isArray(player.statistics) ? player.statistics : [];
  if (!statistics.length) {
    return {
      appearances: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      rating: null,
    };
  }

  const preferredStatistic =
    statistics.find(
      (entry) =>
        fallbackTeam?.id &&
        Number(entry.team_id) === Number(fallbackTeam.id) &&
        Array.isArray(entry.details) &&
        entry.details.length
    ) ||
    statistics.find((entry) => Array.isArray(entry.details) && entry.details.length) ||
    statistics[statistics.length - 1];

  const details = Array.isArray(preferredStatistic.details)
    ? preferredStatistic.details
    : [];
  const detailMap = new Map(
    details
      .filter((detail) => detail?.type?.code)
      .map((detail) => [detail.type.code, detail])
  );

  return {
    appearances: Number(extractStatisticValue(detailMap.get("appearances")) || 0),
    minutes: Number(extractStatisticValue(detailMap.get("minutes-played")) || 0),
    goals: Number(extractStatisticValue(detailMap.get("goals")) || 0),
    assists: Number(extractStatisticValue(detailMap.get("assists")) || 0),
    rating: extractStatisticValue(detailMap.get("rating"), "average") ?? null,
  };
}

function mapPlayer(player, options = {}) {
  const preferredTeam = options.preferredTeam || null;
  const fallbackTeam = options.fallbackTeam || null;
  const defaultLeague = options.defaultLeague || null;
  const relationTeam = player.teams?.[0]?.team || null;
  const relationTeamId = player.teams?.[0]?.team_id || null;
  const preferredName =
    `${player.firstname || ""} ${player.lastname || ""}`.trim() ||
    player.display_name ||
    player.common_name ||
    player.name ||
    null;

  const computedAge =
    player.age ||
    (player.date_of_birth
      ? Math.max(
          0,
          new Date().getFullYear() - new Date(player.date_of_birth).getFullYear()
        )
      : null);

  const resolvedTeam = preferredTeam
    ? {
        id: preferredTeam.id || null,
        name: preferredTeam.name || null,
        league: preferredTeam.league || defaultLeague || null,
      }
    : player.team
    ? {
        id: player.team.id,
        name: player.team.name,
        league: player.team.league || defaultLeague,
      }
    : relationTeam
    ? {
        id: relationTeam.id,
        name: relationTeam.name,
        league: defaultLeague,
      }
    : relationTeamId || fallbackTeam
    ? {
        id: relationTeamId || fallbackTeam?.id || null,
        name: fallbackTeam?.name || null,
        league: fallbackTeam?.league || defaultLeague,
      }
    : null;

  const parsedStatistics = parsePlayerStatistics(player, resolvedTeam);

  return {
    id: player.id,
    name: preferredName,
    firstname: player.firstname || null,
    lastname: player.lastname || null,
    imagePath: player.image_path || null,
    age: computedAge,
    dateOfBirth: player.date_of_birth || null,
    position: player.position?.name || null,
    detailedPosition: player.detailedposition?.name || null,
    nationality: player.country?.name || null,
    team: resolvedTeam,
    league: defaultLeague || fallbackTeam?.league || null,
    statistics: parsedStatistics,
  };
}

function mapTransfer(transfer) {
  return {
    id: transfer.id,
    playerId: transfer.player_id || transfer.player?.id || null,
    playerName:
      transfer.player?.display_name || transfer.player?.common_name || null,
    imagePath:
      transfer.player?.image_path ||
      transfer.player?.imagePath ||
      transfer.player?.photo_path ||
      null,
    fromTeamId: transfer.fromteam?.id || transfer.fromTeam?.id || null,
    fromTeam: transfer.fromteam?.name || transfer.fromTeam?.name || null,
    fromLeague:
      transfer.fromteam?.current_season?.league?.name ||
      transfer.fromTeam?.currentSeason?.league?.name ||
      null,
    toTeamId: transfer.toteam?.id || transfer.toTeam?.id || null,
    toTeam: transfer.toteam?.name || transfer.toTeam?.name || null,
    toLeague:
      transfer.toteam?.current_season?.league?.name ||
      transfer.toTeam?.currentSeason?.league?.name ||
      null,
    type: transfer.type?.name || transfer.transfer_type || null,
    amount: transfer.amount || transfer.fee || null,
    amountCurrency: transfer.currency || "EUR",
    date: transfer.date || transfer.transfer_date || null,
  };
}

function applyTransferOverride(transfer, override) {
  if (!override) {
    return transfer;
  }

  return {
    ...transfer,
    ...override.payload,
    id: transfer.id,
    updatedAt: override.updatedAt,
  };
}

async function applyTransferOverrides(transfers) {
  if (!transfers.length) {
    return transfers;
  }

  if (!isDatabaseAvailable()) {
    return transfers;
  }

  let overrides = [];

  try {
    overrides = await TransferOverride.find({
      transferId: { $in: transfers.map((transfer) => transfer.id) },
    }).lean();
  } catch (error) {
    return transfers;
  }

  const overrideMap = new Map(
    overrides.map((override) => [override.transferId, override])
  );

  return transfers.map((transfer) =>
    applyTransferOverride(transfer, overrideMap.get(transfer.id))
  );
}

function applyPlayerOverride(player, override) {
  if (!override) {
    return player;
  }

  const payload = override.payload || {};

  return {
    ...player,
    ...payload,
    team: payload.team
      ? {
          ...(player.team || {}),
          ...payload.team,
        }
      : player.team,
    statistics: payload.statistics
      ? {
          ...(player.statistics || {}),
          ...payload.statistics,
        }
      : player.statistics,
    updatedAt: override.updatedAt,
  };
}

async function applyPlayerOverrides(players) {
  if (!players.length) {
    return players;
  }

  if (!isDatabaseAvailable()) {
    return players;
  }

  let overrides = [];

  try {
    overrides = await PlayerOverride.find({
      playerId: { $in: players.map((player) => Number(player.id)).filter(Boolean) },
    }).lean();
  } catch (error) {
    return players;
  }

  const overrideMap = new Map(
    overrides.map((override) => [Number(override.playerId), override])
  );

  return players.map((player) =>
    applyPlayerOverride(player, overrideMap.get(Number(player.id)))
  );
}

function estimateMarketValue(player) {
  const age = player.age || 24;
  const appearances = Number(player.statistics?.appearances || 0);
  const goals = Number(player.statistics?.goals || 0);
  const assists = Number(player.statistics?.assists || 0);
  const rating = Number(player.statistics?.rating || 6.5);
  const ageFactor = Math.max(0.55, 1.35 - Math.abs(age - 24) * 0.03);
  const production = appearances * 0.18 + goals * 0.7 + assists * 0.45 + rating;
  return Math.max(1.2, Number((production * ageFactor).toFixed(2)));
}

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function hasOwnProperty(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function sanitizeNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function sanitizeNullableNumber(value, fieldLabel) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw createValidationError(`${fieldLabel} gecerli bir sayi olmali.`);
  }

  return parsed;
}

function buildPlayerOverridePayload(payload = {}) {
  const updates = {};
  const stringFields = [
    "name",
    "firstname",
    "lastname",
    "imagePath",
    "dateOfBirth",
    "position",
    "detailedPosition",
    "nationality",
    "league",
  ];

  stringFields.forEach((field) => {
    if (hasOwnProperty(payload, field)) {
      updates[field] = sanitizeNullableString(payload[field]);
    }
  });

  if (hasOwnProperty(payload, "age")) {
    updates.age = sanitizeNullableNumber(payload.age, "Yas");
  }

  if (payload.team && typeof payload.team === "object") {
    const teamUpdates = {};

    if (hasOwnProperty(payload.team, "id")) {
      teamUpdates.id = sanitizeNullableNumber(payload.team.id, "Tak?m ID");
    }

    if (hasOwnProperty(payload.team, "name")) {
      teamUpdates.name = sanitizeNullableString(payload.team.name);
    }

    if (hasOwnProperty(payload.team, "league")) {
      teamUpdates.league = sanitizeNullableString(payload.team.league);
    }

    if (Object.keys(teamUpdates).length) {
      updates.team = teamUpdates;
    }
  }

  if (!Object.keys(updates).length) {
    throw createValidationError("G?ncellenecek en az bir oyuncu alan? g?nderilmelidir.");
  }

  return updates;
}

async function getTeams(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const normalizedLeague = normalizeLeagueName(query.league);
  const cacheKey = JSON.stringify({
    league: normalizedLeague || null,
    search: query.search || null,
    country: query.country || null,
    excludeTeamId: query.excludeTeamId || null,
  });

  if (teamsCache.has(cacheKey)) {
    const cachedTeams = teamsCache.get(cacheKey);
    return {
      data: cachedTeams.slice(skip, skip + limit),
      pagination: {
        page,
        limit,
        total: cachedTeams.length,
        totalPages: Math.ceil(cachedTeams.length / limit) || 1,
      },
    };
  }

  const include = "currentSeason.league;activeSeasons.league";
  const seasonId = normalizedLeague ? await getLeagueSeasonId(query.league) : null;
  let teamItems;
  let usedLeagueStandings = false;

  try {
    if (seasonId) {
      try {
        teamItems = await requestLeagueStandingsTeams(seasonId);
        usedLeagueStandings = true;
      } catch (leagueError) {
        teamItems = await requestAllTeamPages("/teams", { include }, 20);
      }
    } else {
      teamItems = await requestAllTeamPages("/teams", { include }, 20);
    }
  } catch (error) {
    if (error.response?.status === 429 && teamsCache.has(cacheKey)) {
      const cachedTeams = teamsCache.get(cacheKey);
      return {
        data: cachedTeams.slice(skip, skip + limit),
        pagination: {
          page,
          limit,
          total: cachedTeams.length,
          totalPages: Math.ceil(cachedTeams.length / limit) || 1,
        },
      };
    }

    throw error;
  }

  const teams = teamItems
    .map(mapTeam)
    .filter((team) => {
      if (normalizedLeague) {
        if (usedLeagueStandings && seasonId) {
          return true;
        }
        return normalizeLeagueName(team.league) === normalizedLeague;
      }
      return true;
    })
    .filter((team) => {
      if (query.search) {
        return team.name
          ?.toLowerCase()
          .includes(String(query.search).toLowerCase());
      }
      return true;
    })
    .filter((team) => {
      if (query.country && team.country) {
        return team.country
          .toLowerCase()
          .includes(String(query.country).toLowerCase());
      }
      return true;
    })
    .filter((team) => {
      if (query.excludeTeamId) {
        return Number(team.id) !== Number(query.excludeTeamId);
      }
      return true;
    });

  teamsCache.set(cacheKey, teams);

  return {
    data: teams.slice(skip, skip + limit).map((team) => ({
      ...team,
      league: query.league || team.league,
    })),
    pagination: {
      page,
      limit,
      total: teams.length,
      totalPages: Math.ceil(teams.length / limit) || 1,
    },
  };
}

async function getTeamDetails(teamId, query = {}) {
  const teamNumericId = Number(teamId);
  let teamMeta = null;
  let liveTeamMeta = null;
  const leagueName = query.league || null;
  const leagueId = leagueName ? LEAGUE_IDS[normalizeLeagueName(leagueName)] : null;
  const seasonId = leagueId ? await getLeagueSeasonId(leagueName) : null;
  if (leagueName) {
    try {
      const leagueTeams = await getTeams({
        league: leagueName,
        page: 1,
        limit: 100,
      });
      teamMeta =
        leagueTeams.data.find((team) => Number(team.id) === teamNumericId) || null;
    } catch (error) {
      teamMeta = null;
    }
  }

  try {
    const liveTeamPayload = await request(`/teams/${teamId}`, {
      include: "country;venue;activeSeasons.league;currentSeason.league",
    });
    if (liveTeamPayload.data) {
      liveTeamMeta = mapTeam(liveTeamPayload.data);
    }
  } catch (error) {
    liveTeamMeta = null;
  }
  const [teamPayload, squadPayload, transferPayload] = await Promise.all([
    Promise.resolve({
      data: {
        ...(teamMeta || {}),
        ...(liveTeamMeta || {}),
        id: teamNumericId,
        name: (liveTeamMeta || teamMeta)?.name || query.teamName || `Tak?m #${teamId}`,
        shortCode: (liveTeamMeta || teamMeta)?.shortCode || null,
        country:
          liveTeamMeta?.country ||
          teamMeta?.country ||
          inferLeagueCountry(liveTeamMeta?.league || teamMeta?.league || leagueName),
        founded: liveTeamMeta?.founded || teamMeta?.founded || null,
        imagePath: liveTeamMeta?.imagePath || teamMeta?.imagePath || null,
        venue: liveTeamMeta?.venue || teamMeta?.venue || null,
        league: liveTeamMeta?.league || teamMeta?.league || leagueName,
      },
    }),
    request(`/squads/teams/${teamId}`, {
      include:
        "player.position;player.detailedposition;player.country;player.statistics.details.type",
    }),
    requestAllTeamTransferPages(teamId),
  ]);

  if (!teamPayload.data) {
    const error = new Error("Tak?m bulunamad?.");
    error.statusCode = 404;
    throw error;
  }

  const mappedTransfers = await applyTransferOverrides(
    transferPayload
      .map(mapTransfer)
      .filter(
        (transfer) =>
          Number(transfer.fromTeamId) === teamNumericId ||
          Number(transfer.toTeamId) === teamNumericId
      )
      .sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")))
      .slice(0, 12)
  );

  let leagueStanding = null;
  if (seasonId) {
    try {
      const standingsPayload = await request(`/standings/seasons/${seasonId}`);
      const standing = (standingsPayload.data || []).find(
        (row) => Number(row.participant_id) === teamNumericId
      );

      if (standing) {
        leagueStanding = {
          position: standing.position,
          points: standing.points,
          result: standing.result,
          seasonId,
        };
      }
    } catch (error) {
      leagueStanding = null;
    }
  }

  return {
    team: {
      ...teamPayload.data,
      leagueStanding,
    },
    squad: (squadPayload.data || []).map((entry) =>
      mapPlayer(entry.player || {}, {
        fallbackTeam: teamPayload.data,
        defaultLeague: leagueName || null,
      })
    ),
    transferHistory: mappedTransfers,
  };
}

async function getTeamSquad(teamId, teamMeta = null) {
  const payload = await request(`/squads/teams/${teamId}`, {
    include: "player.position;player.detailedposition;player.country;player.statistics.details.type",
  });

  const fallbackTeam = teamMeta || { id: Number(teamId) };
  const squad = (payload.data || []).map((entry) =>
    mapPlayer(entry.player || {}, {
      fallbackTeam,
      defaultLeague: fallbackTeam.league || null,
    })
  );

  return {
    teamId: Number(teamId),
    count: squad.length,
    data: squad,
  };
}

async function getPlayers(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  if (query.league) {
    const teamsResult = await getTeams({ league: query.league, page: 1, limit: 50 });
    const squadResults = await Promise.all(
      teamsResult.data.map((team) => getTeamSquad(team.id, team))
    );

    let players = squadResults
      .flatMap((squad) => squad.data || [])
      .filter(
        (player, index, allPlayers) =>
          allPlayers.findIndex((candidate) => Number(candidate.id) === Number(player.id)) ===
          index
      );

    if (query.search) {
      const search = String(query.search).toLowerCase();
      players = players.filter((player) => player.name?.toLowerCase().includes(search));
    }

    if (query.position) {
      const position = String(query.position).toLowerCase();
      players = players.filter(
        (player) =>
          player.position?.toLowerCase().includes(position) ||
          player.detailedPosition?.toLowerCase().includes(position)
      );
    }

    const overriddenPlayers = await applyPlayerOverrides(players);

    return {
      data: overriddenPlayers.slice(skip, skip + limit),
      pagination: {
        page,
        limit,
        total: overriddenPlayers.length,
        totalPages: Math.ceil(overriddenPlayers.length / limit) || 1,
      },
    };
  }

  const include = "country;position;detailedposition;statistics.details.type;teams.team";
  const payload = await request("/players", { include, page });

  let players = (payload.data || []).map((player) => mapPlayer(player));

  if (query.teamId) {
    players = players.filter((player) => Number(player.team?.id) === Number(query.teamId));
  }

  if (query.search) {
    const search = String(query.search).toLowerCase();
    players = players.filter((player) => player.name?.toLowerCase().includes(search));
  }

  if (query.position) {
    const position = String(query.position).toLowerCase();
    players = players.filter(
      (player) =>
        player.position?.toLowerCase().includes(position) ||
        player.detailedPosition?.toLowerCase().includes(position)
    );
  }

  if (query.ageMin) {
    players = players.filter((player) => Number(player.age || 0) >= Number(query.ageMin));
  }

  if (query.ageMax) {
    players = players.filter((player) => Number(player.age || 0) <= Number(query.ageMax));
  }

  const overriddenPlayers = await applyPlayerOverrides(players);

  return {
    data: overriddenPlayers.slice(skip, skip + limit),
    pagination: {
      page,
      limit,
      total: overriddenPlayers.length,
      totalPages: Math.ceil(overriddenPlayers.length / limit) || 1,
    },
  };
}

async function getPlayerDetails(playerId, query = {}) {
  const playerPayload = await request(`/players/${playerId}`, {
    include:
      "country;position;detailedposition;statistics.details.type;teams.team;transfers.fromteam;transfers.toteam;transfers.type",
  });

  if (!playerPayload.data) {
    const error = new Error("Oyuncu bulunamad?.");
    error.statusCode = 404;
    throw error;
  }

  const contextTeam =
    query.teamId || query.teamName || query.leagueName
      ? {
          id: query.teamId ? Number(query.teamId) : null,
          name: query.teamName || null,
          league: query.leagueName || query.league || null,
        }
      : null;

  let player = mapPlayer(playerPayload.data, {
    preferredTeam: contextTeam,
    fallbackTeam: contextTeam,
    defaultLeague: contextTeam?.league || null,
  });
  if (player.team?.id && !player.team?.league && !player.league) {
    try {
      const teamPayload = await request(`/teams/${player.team.id}`, { include: "country;venue" });
      const resolvedTeam = mapTeam(teamPayload.data || {});
      if (resolvedTeam.league) {
        player = {
          ...player,
          team: player.team
            ? {
                ...player.team,
                league: resolvedTeam.league,
              }
            : player.team,
          league: resolvedTeam.league,
        };
      }
    } catch (error) {
      player = {
        ...player,
      };
    }
  }

  const playerOverride = isDatabaseAvailable()
    ? await PlayerOverride.findOne({
        playerId: Number(playerId),
      }).lean()
    : null;
  player = applyPlayerOverride(player, playerOverride);
  const marketValue = estimateMarketValue(player);
  const transfers = await applyTransferOverrides(
    (playerPayload.data?.transfers || [])
      .map((transfer) =>
        mapTransfer({
          ...transfer,
          player: {
            id: playerPayload.data.id,
            display_name: playerPayload.data.display_name,
            common_name: playerPayload.data.common_name,
          },
        })
      )
      .filter((transfer) => Number(transfer.playerId) === Number(playerId))
      .sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")))
  );

  return {
    player: {
      ...player,
      marketValue: {
        current: marketValue,
        currency: "M EUR",
      },
      transfers,
    },
  };
}

async function getPlayerMarketValue(playerId, query = {}) {
  const profile = await getPlayerDetails(playerId, query);
  const transfers = profile.player.transfers || [];
  const current = profile.player.marketValue.current;

  const history = transfers.slice(0, 5).map((transfer, index) => ({
    date: transfer.date,
    value: transfer.amount || Number((current * (0.72 + index * 0.06)).toFixed(2)),
    team: transfer.toTeam || transfer.fromTeam,
  }));

  if (!history.length) {
    history.push({
      date: new Date().toISOString().slice(0, 10),
      value: current,
      team: profile.player.team?.name || null,
    });
  }

  return {
    playerId: Number(playerId),
    currentValue: {
      amount: current,
      currency: "M EUR",
    },
    history,
  };
}

async function getTransfers(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const payload = await requestTransferFeed(page);

  let transfers = (payload.data || []).map(mapTransfer);

  if (query.playerId) {
    transfers = transfers.filter(
      (transfer) => Number(transfer.playerId) === Number(query.playerId)
    );
  }

  if (query.dateFrom) {
    transfers = transfers.filter((item) => item.date >= query.dateFrom);
  }

  if (query.dateTo) {
    transfers = transfers.filter((item) => item.date <= query.dateTo);
  }

  if (query.club) {
    const club = String(query.club).toLowerCase();
    transfers = transfers.filter(
      (item) =>
        item.fromTeam?.toLowerCase().includes(club) ||
        item.toTeam?.toLowerCase().includes(club)
    );
  }

  transfers = await applyTransferOverrides(transfers);

  return {
    data: transfers.slice(skip, skip + limit),
    pagination: {
      page,
      limit,
      total: transfers.length,
      totalPages: Math.ceil(transfers.length / limit) || 1,
    },
  };
}

async function buildManualTransferUpdate(transferId, payload, user) {
  if (!isDatabaseAvailable()) {
    throw createDatabaseUnavailableError(
      "Transfer güncellemek için veritabanı bağlantısı gerekli."
    );
  }

  const override = await TransferOverride.findOneAndUpdate(
    { transferId: Number(transferId) },
    {
      transferId: Number(transferId),
      payload,
      updatedBy: user.id,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return {
    message: "Yetkili transfer g?ncelleme i?lemi kaydedildi.",
    audit: {
      updatedBy: user.email,
      updatedAt: override.updatedAt,
      transferId: Number(transferId),
    },
    transfer: {
      id: Number(transferId),
      ...payload,
    },
  };
}

async function buildManualPlayerUpdate(playerId, payload, user) {
  if (!isDatabaseAvailable()) {
    throw createDatabaseUnavailableError(
      "Oyuncu güncellemek için veritabanı bağlantısı gerekli."
    );
  }

  const normalizedPayload = buildPlayerOverridePayload(payload);
  const existingOverride = await PlayerOverride.findOne({
    playerId: Number(playerId),
  }).lean();
  const mergedPayload = {
    ...(existingOverride?.payload || {}),
    ...normalizedPayload,
    team: normalizedPayload.team
      ? {
          ...(existingOverride?.payload?.team || {}),
          ...normalizedPayload.team,
        }
      : existingOverride?.payload?.team,
  };

  const override = await PlayerOverride.findOneAndUpdate(
    { playerId: Number(playerId) },
    {
      playerId: Number(playerId),
      payload: mergedPayload,
      updatedBy: user.id,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return {
    message: "Yetkili oyuncu g?ncelleme i?lemi kaydedildi.",
    audit: {
      updatedBy: user.email,
      updatedAt: override.updatedAt,
      playerId: Number(playerId),
    },
    player: {
      id: Number(playerId),
      ...mergedPayload,
    },
  };
}

module.exports = {
  getTeams,
  getTeamDetails,
  getTeamSquad,
  getPlayers,
  getPlayerDetails,
  getPlayerMarketValue,
  getTransfers,
  getLeagueMeta,
  buildManualTransferUpdate,
  buildManualPlayerUpdate,
};
