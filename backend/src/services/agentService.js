const footballService = require("./footballService");
const aiService = require("./aiService");
const lmStudioService = require("./lmStudioService");

const SUPPORTED_LEAGUES = [
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .toLowerCase()
    .trim();
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatMarketValue(player) {
  const value = safeNumber(player?.marketValue?.current, 0);
  return value
    ? `${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} M EUR`
    : "-";
}

function formatRating(player) {
  const rating = player?.statistics?.rating;
  return rating == null ? "-" : Number(rating).toFixed(2);
}

function formatContribution(player) {
  const goals = safeNumber(player?.statistics?.goals, 0);
  const assists = safeNumber(player?.statistics?.assists, 0);
  return `${goals} gol / ${assists} asist`;
}

function buildPlayerSnippet(player) {
  return [
    `${player.name}`,
    `${player.team?.name || "Takimsiz"} - ${player.team?.league || player.league || "Lig bilgisi yok"}`,
    `${player.age || "-"} yas`,
    `${formatContribution(player)}`,
    `Rating: ${formatRating(player)}`,
    `Piyasa degeri: ${formatMarketValue(player)}`,
  ].join(" | ");
}

function cleanEntityName(value) {
  return String(value || "")
    .replace(/karsilastir(ir)? misin/gi, " ")
    .replace(/karsilastir(?!ma)/gi, " ")
    .replace(/karsilastirma(si)?/gi, " ")
    .replace(/kim daha iyi/gi, " ")
    .replace(/su an|simdi|guncel|guncelde/gi, " ")
    .replace(/nasil bir profil ciziyor|nasil gorunuyor|nasil duruyor/gi, " ")
    .replace(/takim yapisi|kadro yapisi|ilk on bir/gi, " ")
    .replace(/analizi|ozeti|oyuncu|futbolcu|profili|profil|performansi|performans/gi, " ")
    .replace(/forvet|santrfor|kanat|orta saha|ortasaha|stoper|bek|kaleci|defans|defender|midfielder|forward|striker|winger/gi, " ")
    .replace(/nasil bir|ne tur bir|ne kadar iyi|nasil/gi, " ")
    .replace(/yorumu|yorumla|hakkinda|degerlendir|incele|analiz et/gi, " ")
    .replace(/transfer trendi|transfer analizi|transfer hareketi/gi, " ")
    .replace(/takimi|takim|kulubu|kulup|club|kadro|yapisi/gi, " ")
    .replace(/[?'".,!():]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreNameMatch(source, target) {
  const normalizedSource = normalizeText(source);
  const normalizedTarget = normalizeText(target);

  if (!normalizedSource || !normalizedTarget) {
    return 0;
  }

  if (normalizedSource === normalizedTarget) {
    return 100;
  }

  if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
    return 82;
  }

  const sourceTokens = normalizedSource.split(/\s+/).filter(Boolean);
  const targetTokens = normalizedTarget.split(/\s+/).filter(Boolean);
  const intersection = targetTokens.filter((token) => sourceTokens.includes(token)).length;

  if (!intersection) {
    return 0;
  }

  return Math.round((intersection / Math.max(targetTokens.length, sourceTokens.length)) * 75);
}

function pickBestMatch(items, target, getLabel) {
  let bestItem = null;
  let bestScore = 0;

  for (const item of items) {
    const score = scoreNameMatch(getLabel(item), target);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore >= 45 ? bestItem : null;
}

function buildSearchVariants(name) {
  const cleaned = cleanEntityName(name);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const variants = new Set();

  if (cleaned) {
    variants.add(cleaned);
  }

  if (parts.length >= 2) {
    variants.add(parts.slice(0, 2).join(" "));
    variants.add(parts.slice(-2).join(" "));
  }

  if (parts.length >= 1) {
    variants.add(parts[parts.length - 1]);
    variants.add(parts[0]);
  }

  if (parts.length >= 3) {
    variants.add(parts.slice(0, 3).join(" "));
  }

  return Array.from(variants).filter(Boolean);
}

function buildPlayerProfileFallback(player, league) {
  return {
    player: {
      ...player,
      league: player.team?.league || player.league || league || null,
      marketValue: player.marketValue || {
        current: safeNumber(player.marketValue?.current, 5),
        currency: "M EUR",
      },
      transfers: player.transfers || [],
    },
  };
}

function isExternalDataIssue(error) {
  const statusCode = Number(error?.response?.status || error?.statusCode || 0);
  return (
    statusCode === 429 ||
    statusCode >= 500 ||
    error?.code === "ECONNABORTED" ||
    error?.code === "ENOTFOUND"
  );
}

function extractPlayerQuery(message) {
  return cleanEntityName(
    String(message || "")
      .replace(/takim|kulup|kadro/gi, " ")
      .replace(/\b([A-Za-zÀ-ÿ]+)['’](nin|nın|nun|nün|in|ın|un|ün)\b/gi, "$1")
  );
}

function extractTeamQuery(message) {
  return cleanEntityName(
    String(message || "")
      .replace(/\b([A-Za-zÀ-ÿ]+)['’](nin|nın|nun|nün|in|ın|un|ün)\b/gi, "$1")
      .replace(/\b([A-Za-zÀ-ÿ]+)(nin|nın|nun|nün|in|ın|un|ün)\b/gi, "$1")
  );
}

function splitComparisonQuery(message) {
  const normalized = normalizeText(message);
  const hasComparisonIntent =
    normalized.includes("karsilastir") ||
    normalized.includes("karsilastirma") ||
    normalized.includes("compare") ||
    normalized.includes("vs") ||
    normalized.includes("kim daha iyi") ||
    normalized.includes("ile");

  if (!hasComparisonIntent) {
    return null;
  }

  const cleaned = cleanEntityName(
    normalized
      .replace(/karsilastir(ir)? misin/g, "")
      .replace(/karsilastirma(si)?/g, "")
      .replace(/kim daha iyi/g, "")
  );

  const separators = [" vs ", " ile ", " ve "];

  for (const separator of separators) {
    if (cleaned.includes(separator)) {
      const parts = cleaned.split(separator).map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          first: cleanEntityName(parts[0]),
          second: cleanEntityName(parts[1]),
        };
      }
    }
  }

  return null;
}

function findLeagueInMessage(message) {
  const normalized = normalizeText(message);
  return SUPPORTED_LEAGUES.find((league) => normalized.includes(normalizeText(league))) || null;
}

function findLeaguesInMessage(message) {
  const normalized = normalizeText(message);
  return SUPPORTED_LEAGUES.filter((league) =>
    normalized.includes(normalizeText(league))
  );
}

function looksLikeTeamQuestion(message) {
  const normalized = normalizeText(message);
  return (
    normalized.includes("takim") ||
    normalized.includes("kulup") ||
    normalized.includes("club") ||
    normalized.includes("kadro") ||
    normalized.includes("ilk on bir") ||
    normalized.includes("yapisi")
  );
}

function looksLikeLeagueQuestion(message) {
  const normalized = normalizeText(message);
  return (
    normalized.includes("transfer") ||
    normalized.includes("trend") ||
    normalized.includes("hareket") ||
    normalized.includes("piyasa")
  );
}

function looksLikeLeagueStatsQuestion(message) {
  const normalized = normalizeText(message);

  if (!normalized.includes("lig")) {
    return false;
  }

  const statsKeywords = [
    "kac takim",
    "kaç takim",
    "kac oyuncu",
    "kaç oyuncu",
    "toplam gol",
    "gol sayisi",
    "gol sayısı",
    "istatistik",
    "sayisi",
    "sayısı",
  ];

  return statsKeywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function looksLikeLeagueComparisonQuestion(message) {
  const normalized = normalizeText(message);

  const comparisonKeywords = [
    "kiyasla",
    "kıyasla",
    "karsilastir",
    "karşılaştır",
    "fark",
    "hangisi",
    "arasindaki",
    "arasındaki",
  ];

  return comparisonKeywords.some((keyword) =>
    normalized.includes(normalizeText(keyword))
  );
}

function buildUnavailablePlayerAnswer(query) {
  return {
    answer: [
      `${query} icin su anda net oyuncu verisi bulunamadi.`,
      "",
      "Nedenleri:",
      "- Oyuncu veri kaynaginda farkli adla geciyor olabilir",
      "- Soru, mevcut agent akisi tarafindan oyuncu aramasi gibi yorumlanmis olabilir",
      "- Istenen karsilastirma tipi icin ayri lig ozeti mantigi gerekebilir",
      "",
      "Daha iyi sonuc icin soruyu daha acik yazmayi dene.",
      "Ornek: Bundesliga ile Premier League lig istatistiklerini karsilastir",
    ].join("\n"),
    relatedChunks: [],
    mode: "player-unavailable",
  };
}

function buildExternalSourceUnavailableAnswer(query, subject = "oyuncu") {
  return {
    answer: [
      `${query} icin dis veri kaynagi su anda cevap vermiyor.`,
      "",
      `Bu nedenle net ${subject} analizi olusturulamadi.`,
      "",
      "Lutfen biraz sonra tekrar dene.",
    ].join("\n"),
    relatedChunks: [],
    mode: "external-source-unavailable",
  };
}

function buildLeagueDataUnavailableAnswer(leagues = []) {
  const label = leagues.filter(Boolean).join(" ve ") || "istenen lig";

  return {
    answer: [
      `${label} icin gerekli lig verileri su anda alinmiyor.`,
      "",
      "Bu nedenle net lig karsilastirmasi / lig ozeti olusturulamadi.",
      "",
      "Biraz sonra tekrar dene.",
    ].join("\n"),
    relatedChunks: [],
    mode: "league-data-unavailable",
  };
}

async function findPlayerByName(name) {
  const cleanedName = cleanEntityName(name);
  const normalizedTarget = normalizeText(cleanedName);
  const searchVariants = buildSearchVariants(cleanedName);
  let externalFailureDetected = false;

  if (!normalizedTarget) {
    return null;
  }

  for (const league of SUPPORTED_LEAGUES) {
    for (const searchText of searchVariants) {
      try {
        const playersResponse = await footballService.getPlayers({
          league,
          search: searchText,
          page: 1,
          limit: 120,
        });

        const players = playersResponse.data || [];
        const match = pickBestMatch(players, normalizedTarget, (player) => player.name);

        if (match) {
          try {
            return await footballService.getPlayerDetails(match.id, {
              teamId: match.team?.id,
              teamName: match.team?.name,
              league: match.team?.league || league,
              leagueName: match.team?.league || league,
            });
          } catch (error) {
            return buildPlayerProfileFallback(match, league);
          }
        }
      } catch (error) {
        if (isExternalDataIssue(error)) {
          externalFailureDetected = true;
        }
        continue;
      }
    }
  }

  for (const searchText of searchVariants) {
    try {
      const playersResponse = await footballService.getPlayers({
        search: searchText,
        page: 1,
        limit: 80,
      });
      const fallbackPlayers = playersResponse.data || [];
      const fallbackMatch = pickBestMatch(
        fallbackPlayers,
        normalizedTarget,
        (player) => player.name
      );

      if (fallbackMatch) {
        try {
          return await footballService.getPlayerDetails(fallbackMatch.id, {
            teamId: fallbackMatch.team?.id,
            teamName: fallbackMatch.team?.name,
            league: fallbackMatch.team?.league,
            leagueName: fallbackMatch.team?.league,
          });
        } catch (error) {
          return buildPlayerProfileFallback(fallbackMatch, fallbackMatch.team?.league);
        }
      }
    } catch (error) {
      if (isExternalDataIssue(error)) {
        externalFailureDetected = true;
      }
      continue;
    }
  }

  if (externalFailureDetected) {
    return {
      externalFailure: true,
      query: cleanedName,
      subject: "oyuncu",
    };
  }

  return null;
}

async function findTeamByName(name) {
  const cleanedName = cleanEntityName(name);
  const normalizedTarget = normalizeText(cleanedName);
  let externalFailureDetected = false;

  if (!normalizedTarget) {
    return null;
  }

  let match = null;

  for (const league of SUPPORTED_LEAGUES) {
    try {
      const teamsResponse = await footballService.getTeams({
        league,
        search: cleanedName,
        page: 1,
        limit: 100,
      });
      const teams = teamsResponse.data || [];
      match = pickBestMatch(teams, normalizedTarget, (team) => team.name);

      if (match) {
        return footballService.getTeamDetails(match.id, {
          league: match.league || league,
          teamName: match.name,
        });
      }
    } catch (error) {
      if (isExternalDataIssue(error)) {
        externalFailureDetected = true;
      }
      continue;
    }
  }

  try {
    const teamsResponse = await footballService.getTeams({
      search: cleanedName,
      page: 1,
      limit: 80,
    });
    const teams = teamsResponse.data || [];
    match = pickBestMatch(teams, normalizedTarget, (team) => team.name);

    if (!match) {
      return null;
    }

    return footballService.getTeamDetails(match.id, {
      league: match.league,
      teamName: match.name,
    });
  } catch (error) {
    if (isExternalDataIssue(error)) {
      return {
        externalFailure: true,
        query: cleanedName,
        subject: "takim",
      };
    }
    return externalFailureDetected
      ? {
          externalFailure: true,
          query: cleanedName,
          subject: "takim",
        }
      : null;
  }
}

function buildComparisonAnswer(leftPlayer, rightPlayer) {
  const leftProjection = aiService.calculatePlayerValueProjection(leftPlayer);
  const rightProjection = aiService.calculatePlayerValueProjection(rightPlayer);

  const leftContribution =
    safeNumber(leftPlayer.statistics?.goals) + safeNumber(leftPlayer.statistics?.assists);
  const rightContribution =
    safeNumber(rightPlayer.statistics?.goals) + safeNumber(rightPlayer.statistics?.assists);

  let verdict = "Genel tablo dengeli gorunuyor.";

  if (safeNumber(leftPlayer.statistics?.rating) > safeNumber(rightPlayer.statistics?.rating)) {
    verdict = `${leftPlayer.name} su an rating tarafinda onde.`;
  } else if (
    safeNumber(rightPlayer.statistics?.rating) > safeNumber(leftPlayer.statistics?.rating)
  ) {
    verdict = `${rightPlayer.name} su an rating tarafinda onde.`;
  }

  if (leftContribution !== rightContribution) {
    const leader = leftContribution > rightContribution ? leftPlayer.name : rightPlayer.name;
    verdict += ` Skor katkisi tarafinda ${leader} daha verimli gorunuyor.`;
  }

  if (
    safeNumber(leftProjection.projectedValue?.amount) !==
    safeNumber(rightProjection.projectedValue?.amount)
  ) {
    const leader =
      safeNumber(leftProjection.projectedValue?.amount) >
      safeNumber(rightProjection.projectedValue?.amount)
        ? leftPlayer.name
        : rightPlayer.name;
    verdict += ` 12 aylik piyasa projeksiyonunda ${leader} daha yuksek tavan sunuyor.`;
  }

  return {
    answer: [
      `${leftPlayer.name} ile ${rightPlayer.name} karsilastirmasi:`,
      "",
      `- ${buildPlayerSnippet(leftPlayer)}`,
      `- ${buildPlayerSnippet(rightPlayer)}`,
      "",
      `Ozet: ${verdict}`,
      "",
      `AI projeksiyonu: ${leftPlayer.name} -> ${safeNumber(
        leftProjection.projectedValue?.amount
      ).toFixed(2)} M EUR, ${rightPlayer.name} -> ${safeNumber(
        rightProjection.projectedValue?.amount
      ).toFixed(2)} M EUR`,
    ].join("\n"),
    relatedChunks: [buildPlayerSnippet(leftPlayer), buildPlayerSnippet(rightPlayer)],
    mode: "player-comparison",
  };
}

function buildPlayerAnalysisAnswer(player) {
  const projection = aiService.calculatePlayerValueProjection(player);
  const preferredLeague = player.team?.league || player.league || "Premier League";
  const contribution = safeNumber(player.statistics?.goals) + safeNumber(player.statistics?.assists);
  const rating = safeNumber(player.statistics?.rating, 0);

  let verdict = "gelisime acik";
  if (rating >= 7.15 || contribution >= 10) {
    verdict = "ust bantta";
  } else if (rating >= 6.85 || contribution >= 6) {
    verdict = "istikrarli";
  }

  return {
    answer: [
      `${player.name} oyuncu profili:`,
      "",
      `Takim: ${player.team?.name || "-"}`,
      `Lig: ${player.team?.league || player.league || "-"}`,
      `Yas: ${player.age || "-"}`,
      `Katki: ${formatContribution(player)}`,
      `Rating: ${formatRating(player)}`,
      `Piyasa degeri: ${formatMarketValue(player)}`,
      `12 aylik AI projeksiyonu: ${safeNumber(projection.projectedValue?.amount).toFixed(2)} M EUR`,
      `Trend: ${projection.outlook}`,
      "",
      `Kisa yorum: ${player.name}, ${preferredLeague} temposuna gore ${verdict} bir profil ciziyor.`,
    ].join("\n"),
    relatedChunks: [
      buildPlayerSnippet(player),
      `12 aylik projeksiyon: ${safeNumber(projection.projectedValue?.amount).toFixed(2)} M EUR`,
      `Gorunum: ${projection.outlook}`,
    ],
    mode: "player-analysis",
  };
}

function buildTeamAnswer(teamReport) {
  const team = teamReport.team;
  const aiReport = aiService.buildTeamAiReport(
    teamReport.team,
    teamReport.squad,
    teamReport.transferHistory
  );

  return {
    answer: [
      `${team.name} kadro ve takim ozeti:`,
      "",
      `Lig: ${team.league || "-"}`,
      `Ulke: ${team.country || "-"}`,
      `Kadro derinligi: ${aiReport.metrics.squadDepth}`,
      `Ortalama yas: ${aiReport.metrics.averageAge}`,
      `Ortalama rating: ${aiReport.metrics.averageRating}`,
      `Toplam gol katkisi: ${safeNumber(aiReport.metrics.totalGoals) + safeNumber(aiReport.metrics.totalAssists)}`,
      `AI durum: ${aiReport.status}`,
      "",
      `Guclu yon: ${aiReport.narrative.strengths[0] || "-"}`,
      `Risk: ${aiReport.narrative.risks[0] || "-"}`,
      `Oneri: ${aiReport.narrative.recommendations[0] || "-"}`,
    ].join("\n"),
    relatedChunks: [
      `${team.name} | ${team.league || "-"} | ${team.country || "-"}`,
      `Kadro: ${aiReport.metrics.squadDepth}, ort. yas: ${aiReport.metrics.averageAge}, ort. rating: ${aiReport.metrics.averageRating}`,
    ],
    mode: "team-analysis",
  };
}

function buildLeagueTrendAnswer(league, report) {
  const topClub = report.topDestinationClubs?.[0];
  return {
    answer: [
      `${league} transfer trend ozeti:`,
      "",
      `Analiz edilen transfer sayisi: ${report.summary?.totalTransfers || 0}`,
      `Ortalama bonservis: ${report.summary?.averageFee || 0} EUR`,
      `One cikan kulup: ${topClub?.club || "veri yok"}`,
      "",
      ...(report.insights || []),
    ].join("\n"),
    relatedChunks: [
      `${league} | transfer sayisi: ${report.summary?.totalTransfers || 0}`,
      ...(report.topDestinationClubs || [])
        .slice(0, 2)
        .map((item) => `${item.club}: ${item.count}`),
    ],
    mode: "league-trend",
  };
}

function buildLeagueStatsAnswer(league, leagueStats) {
  return {
    answer: [
      `${league} lig ozeti:`,
      "",
      `Takim sayisi: ${leagueStats.teamCount}`,
      `Oyuncu sayisi: ${leagueStats.playerCount}`,
      `Toplam gol sayisi: ${leagueStats.totalGoals}`,
      "",
      `Not: gol toplami, ligde taranan oyuncu istatistiklerindeki gol verilerinin toplami ile hesaplandi.`,
    ].join("\n"),
    relatedChunks: [
      `${league} | takim: ${leagueStats.teamCount}`,
      `${league} | oyuncu: ${leagueStats.playerCount}`,
      `${league} | gol: ${leagueStats.totalGoals}`,
    ],
    mode: "league-stats",
  };
}

function buildLeagueComparisonAnswer(leftLeague, leftStats, rightLeague, rightStats) {
  const teamDiff = leftStats.teamCount - rightStats.teamCount;
  const playerDiff = leftStats.playerCount - rightStats.playerCount;
  const goalDiff = leftStats.totalGoals - rightStats.totalGoals;

  const comparisons = [
    `${leftLeague}: ${leftStats.teamCount} takim, ${leftStats.playerCount} oyuncu, ${leftStats.totalGoals} gol`,
    `${rightLeague}: ${rightStats.teamCount} takim, ${rightStats.playerCount} oyuncu, ${rightStats.totalGoals} gol`,
    "",
    `Takim farki: ${Math.abs(teamDiff)} (${teamDiff === 0 ? "esit" : teamDiff > 0 ? `${leftLeague} daha fazla` : `${rightLeague} daha fazla`})`,
    `Oyuncu farki: ${Math.abs(playerDiff)} (${playerDiff === 0 ? "esit" : playerDiff > 0 ? `${leftLeague} daha fazla` : `${rightLeague} daha fazla`})`,
    `Gol farki: ${Math.abs(goalDiff)} (${goalDiff === 0 ? "esit" : goalDiff > 0 ? `${leftLeague} daha fazla` : `${rightLeague} daha fazla`})`,
  ];

  return {
    answer: [
      `${leftLeague} ile ${rightLeague} lig karsilastirmasi:`,
      "",
      ...comparisons,
    ].join("\n"),
    relatedChunks: [
      `${leftLeague} | takim: ${leftStats.teamCount} | oyuncu: ${leftStats.playerCount} | gol: ${leftStats.totalGoals}`,
      `${rightLeague} | takim: ${rightStats.teamCount} | oyuncu: ${rightStats.playerCount} | gol: ${rightStats.totalGoals}`,
    ],
    mode: "league-comparison",
  };
}

async function buildLeagueStats(league) {
  let teamsResponse;
  let playersResponse;

  try {
    [teamsResponse, playersResponse] = await Promise.all([
      footballService.getTeams({
        league,
        page: 1,
        limit: 100,
      }),
      footballService.getPlayers({
        league,
        page: 1,
        limit: 1000,
      }),
    ]);
  } catch (error) {
    if (isExternalDataIssue(error)) {
      return {
        externalFailure: true,
        league,
      };
    }

    throw error;
  }

  const teams = teamsResponse.data || [];
  const players = playersResponse.data || [];
  const totalGoals = players.reduce(
    (sum, player) => sum + safeNumber(player?.statistics?.goals, 0),
    0
  );

  return {
    teamCount: teams.length,
    playerCount: players.length,
    totalGoals,
  };
}

async function buildFootballAnswer(message) {
  const comparison = splitComparisonQuery(message);

  if (comparison) {
    const [leftProfile, rightProfile] = await Promise.all([
      findPlayerByName(comparison.first),
      findPlayerByName(comparison.second),
    ]);

    if (leftProfile?.player && rightProfile?.player) {
      return buildComparisonAnswer(leftProfile.player, rightProfile.player);
    }
  }

  const leagues = findLeaguesInMessage(message);
  if (leagues.length >= 2 && looksLikeLeagueComparisonQuestion(message)) {
    const [leftLeague, rightLeague] = leagues;
    const [leftStats, rightStats] = await Promise.all([
      buildLeagueStats(leftLeague),
      buildLeagueStats(rightLeague),
    ]);

    if (leftStats?.externalFailure || rightStats?.externalFailure) {
      return buildLeagueDataUnavailableAnswer([leftLeague, rightLeague]);
    }

    return buildLeagueComparisonAnswer(
      leftLeague,
      leftStats,
      rightLeague,
      rightStats
    );
  }

  const league = leagues[0] || null;

  if (league && looksLikeLeagueStatsQuestion(message)) {
    const leagueStats = await buildLeagueStats(league);
    if (leagueStats?.externalFailure) {
      return buildLeagueDataUnavailableAnswer([league]);
    }
    return buildLeagueStatsAnswer(league, leagueStats);
  }

  if (league && looksLikeLeagueQuestion(message)) {
    const transfers = await footballService.getTransfers({
      page: 1,
      limit: 50,
      league,
    });
    const report = aiService.buildTransferTrendReport(transfers.data || []);
    return buildLeagueTrendAnswer(league, report);
  }

  if (looksLikeTeamQuestion(message)) {
    const teamQuery = extractTeamQuery(message);
    if (teamQuery) {
      const teamProfile = await findTeamByName(teamQuery);
      if (teamProfile?.team) {
        return buildTeamAnswer(teamProfile);
      }
      if (teamProfile?.externalFailure) {
        return buildExternalSourceUnavailableAnswer(teamProfile.query, teamProfile.subject);
      }
    }
  }

  const playerQuery = extractPlayerQuery(message);
  const playerProfile = await findPlayerByName(playerQuery || message);
  if (playerProfile?.player) {
    return buildPlayerAnalysisAnswer(playerProfile.player);
  }
  if (playerProfile?.externalFailure) {
    return buildExternalSourceUnavailableAnswer(playerProfile.query, playerProfile.subject);
  }

  if (playerQuery) {
    return buildUnavailablePlayerAnswer(playerQuery);
  }

  return {
    answer: [
      "Bu agent futbol odakli calisir.",
      "",
      "Su tur sorular sorabilirsin:",
      "- Arda Guler su an nasil bir profil ciziyor",
      "- Juventusun kadro yapisi nasil gorunuyor",
      "- Arda Guler ile Kenan Yildiz karsilastir",
      "- Serie A transfer trendi nedir",
    ].join("\n"),
    relatedChunks: [],
    mode: "guide",
  };
}

async function createAgentReply({ message, history = [] }) {
  const trimmedMessage = String(message || "").trim();

  if (!trimmedMessage) {
    return {
      answer: "Lutfen bir soru yaz.",
      mode: "empty",
      relatedChunks: [],
    };
  }

  const draftResponse = await buildFootballAnswer(trimmedMessage);

  if (!lmStudioService.isConfigured()) {
    return {
      ...draftResponse,
      warning: "LM Studio ayarlari bulunamadi. Yerel kural tabanli cevap kullanildi.",
    };
  }

  try {
    const llmResponse = await lmStudioService.generateAgentAnswer({
      message: trimmedMessage,
      history,
      draftAnswer: draftResponse.answer,
      relatedChunks: draftResponse.relatedChunks,
    });

    return {
      ...draftResponse,
      answer: llmResponse.answer,
      model: llmResponse.model,
    };
  } catch (error) {
    return {
      ...draftResponse,
      warning: `LM Studio yaniti alinamadi. Yerel cevap kullanildi. (${error.message})`,
    };
  }
}

module.exports = {
  createAgentReply,
};
