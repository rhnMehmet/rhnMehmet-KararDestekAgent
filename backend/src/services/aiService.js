const LEAGUE_PROFILES = {
  "premier league": {
    name: "Premier League",
    tempo: 88,
    physicality: 86,
    creativity: 72,
    discipline: 71,
    finishing: 76,
    youthTrust: 66,
    summary: "Yuksek tempo, fiziksel temas ve  gecis oyunu agirlikli.",
  },
  "la liga": {
    name: "La Liga",
    tempo: 73,
    physicality: 67,
    creativity: 88,
    discipline: 79,
    finishing: 74,
    youthTrust: 72,
    summary: "Teknik kalite, pas kalitesi ve oyun zekasi one cikar.",
  },
  bundesliga: {
    name: "Bundesliga",
    tempo: 83,
    physicality: 80,
    creativity: 74,
    discipline: 75,
    finishing: 80,
    youthTrust: 84,
    summary: "Dikey oyun, hızlı geçiş ve gelişim odaklı yapılar belirgin.",
  },
  "serie a": {
    name: "Serie A",
    tempo: 69,
    physicality: 74,
    creativity: 70,
    discipline: 90,
    finishing: 71,
    youthTrust: 61,
    summary: "Taktik duzen, savunma disiplini ve konumsal oyun kritik.",
  },
  "ligue 1": {
    name: "Ligue 1",
    tempo: 79,
    physicality: 82,
    creativity: 70,
    discipline: 68,
    finishing: 73,
    youthTrust: 86,
    summary: "Atletizm, birebir kalite ve genc oyuncu kullanimi yuksek.",
  },
};

const POSITION_TARGETS = {
  goalkeeper: {
    physicality: "discipline",
    defending: "discipline",
    creation: "creativity",
    finishing: "finishing",
    availability: 74,
    momentum: "tempo",
  },
  defender: {
    physicality: "physicality",
    defending: "discipline",
    creation: "creativity",
    finishing: "finishing",
    availability: 76,
    momentum: "tempo",
  },
  midfielder: {
    physicality: "physicality",
    defending: "discipline",
    creation: "creativity",
    finishing: "finishing",
    availability: 75,
    momentum: "tempo",
  },
  forward: {
    physicality: "physicality",
    defending: "discipline",
    creation: "creativity",
    finishing: "finishing",
    availability: 72,
    momentum: "tempo",
  },
};

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!valid.length) {
    return 0;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function normalizeLeagueName(league) {
  if (!league) {
    return null;
  }

  return String(league).trim().toLowerCase();
}

function getLeagueProfile(leagueName) {
  return (
    LEAGUE_PROFILES[normalizeLeagueName(leagueName)] || {
      name: leagueName || "Hedef lig",
      tempo: 76,
      physicality: 74,
      creativity: 74,
      discipline: 74,
      finishing: 74,
      youthTrust: 70,
      summary: "Lig profili varsayilan denge puanlariyla hesaplandi.",
    }
  );
}

function getPositionGroup(player) {
  const positionText = String(
    player.detailedPosition || player.position || ""
  ).toLowerCase();

  if (
    positionText.includes("goalkeeper") ||
    positionText.includes("keeper") ||
    positionText.includes("kaleci")
  ) {
    return "goalkeeper";
  }

  if (
    positionText.includes("back") ||
    positionText.includes("def") ||
    positionText.includes("centre-back") ||
    positionText.includes("stopper")
  ) {
    return "defender";
  }

  if (
    positionText.includes("mid") ||
    positionText.includes("wing") ||
    positionText.includes("pivot")
  ) {
    return "midfielder";
  }

  if (
    positionText.includes("for") ||
    positionText.includes("striker") ||
    positionText.includes("att") ||
    positionText.includes("second striker")
  ) {
    return "forward";
  }

  return "midfielder";
}

function buildPlayerSignals(player) {
  const age = safeNumber(player.age, 24);
  const appearances = safeNumber(player.statistics?.appearances);
  const minutes = safeNumber(player.statistics?.minutes);
  const goals = safeNumber(player.statistics?.goals);
  const assists = safeNumber(player.statistics?.assists);
  const rating = safeNumber(player.statistics?.rating, 6.5);
  const positionGroup = getPositionGroup(player);

  const availability = clamp(appearances * 1.8 + minutes / 80);
  const finishing = clamp(goals * 14 + rating * 6 + assists * 1.5);
  const creation = clamp(assists * 15 + rating * 6.5 + appearances * 1.25);
  const defending = clamp(
    positionGroup === "defender" || positionGroup === "goalkeeper"
      ? rating * 9 + appearances * 2.2 + minutes / 130
      : rating * 5.4 + appearances * 1.1 + minutes / 220
  );
  const physicality = clamp(
    58 + appearances * 0.85 + minutes / 260 - Math.abs(age - 26) * 1.9
  );
  const momentum = clamp(goals * 4 + assists * 3.25 + rating * 7.6 + appearances * 0.95);

  return {
    age,
    appearances,
    minutes,
    goals,
    assists,
    rating,
    positionGroup,
    availability: round(availability),
    finishing: round(finishing),
    creation: round(creation),
    defending: round(defending),
    physicality: round(physicality),
    momentum: round(momentum),
  };
}

function resolveContractMonthsRemaining(context = {}) {
  if (Number.isFinite(Number(context.contractMonthsRemaining))) {
    return Math.max(0, Number(context.contractMonthsRemaining));
  }

  if (context.contractEndDate) {
    const now = new Date();
    const contractEnd = new Date(context.contractEndDate);

    if (!Number.isNaN(contractEnd.getTime())) {
      const months =
        (contractEnd.getFullYear() - now.getFullYear()) * 12 +
        (contractEnd.getMonth() - now.getMonth());

      return Math.max(0, months);
    }
  }

  return null;
}

function getMarketTrendSignals(team, trendReport = {}) {
  const topDestinationClubs = Array.isArray(trendReport.topDestinationClubs)
    ? trendReport.topDestinationClubs
    : [];
  const topDestinationLeagues = Array.isArray(trendReport.topDestinationLeagues)
    ? trendReport.topDestinationLeagues
    : [];

  const clubTrend = topDestinationClubs.find(
    (entry) => entry.club && entry.club.toLowerCase() === String(team.name || "").toLowerCase()
  );
  const leagueTrend = topDestinationLeagues.find(
    (entry) =>
      entry.league &&
      entry.league.toLowerCase() === String(team.league || "").toLowerCase()
  );

  return {
    clubTrendScore: clubTrend ? Math.min(18, clubTrend.count * 4) : 0,
    leagueTrendScore: leagueTrend ? Math.min(12, leagueTrend.count * 2.5) : 0,
  };
}

function scoreSignalMatch(actualValue, targetValue) {
  return clamp(100 - Math.abs(safeNumber(actualValue) - safeNumber(targetValue)) * 1.15);
}

function resolveTargetValue(targetConfig, profile) {
  if (typeof targetConfig === "number") {
    return targetConfig;
  }

  return safeNumber(profile[targetConfig], 74);
}

function scoreLeagueFit(player, leagueName) {
  const signals = buildPlayerSignals(player);
  const profile = getLeagueProfile(leagueName);
  const targetTemplate = POSITION_TARGETS[signals.positionGroup] || POSITION_TARGETS.midfielder;

  const factorScores = {
    physicality: scoreSignalMatch(
      signals.physicality,
      resolveTargetValue(targetTemplate.physicality, profile)
    ),
    defending: scoreSignalMatch(
      signals.defending,
      resolveTargetValue(targetTemplate.defending, profile)
    ),
    creation: scoreSignalMatch(
      signals.creation,
      resolveTargetValue(targetTemplate.creation, profile)
    ),
    finishing: scoreSignalMatch(
      signals.finishing,
      resolveTargetValue(targetTemplate.finishing, profile)
    ),
    availability: scoreSignalMatch(signals.availability, targetTemplate.availability),
    momentum: scoreSignalMatch(
      signals.momentum,
      resolveTargetValue(targetTemplate.momentum, profile)
    ),
  };

  const ageWindowScore = clamp(100 - Math.abs(signals.age - 25) * 5 + profile.youthTrust * 0.12);
  const weightedScore = round(
    factorScores.physicality * 0.18 +
      factorScores.defending * 0.14 +
      factorScores.creation * 0.2 +
      factorScores.finishing * 0.2 +
      factorScores.availability * 0.14 +
      factorScores.momentum * 0.14 +
      ageWindowScore * 0.12
  );

  return {
    score: clamp(weightedScore),
    profile,
    signals,
    ageWindowScore: round(ageWindowScore),
    factors: [
      {
        label: "Lig stili uyumu",
        score: round((factorScores.physicality + factorScores.creation + factorScores.finishing) / 3),
        detail: profile.summary,
      },
      {
        label: "Taktik talepler",
        score: round((factorScores.defending + factorScores.momentum) / 2),
        detail: `${profile.name} için ${signals.positionGroup} rolündeki gereksinimler karşılaştırıldı.`,
      },
      {
        label: "Süreklilik",
        score: factorScores.availability,
        detail: `${signals.appearances} maç ve ${signals.minutes} dakika verisi kullanıldı.`,
      },
      {
        label: "Yaş penceresi",
        score: round(ageWindowScore),
        detail: `Lig gelişim profili ile ${signals.age} yaş birlikte okundu.`,
      },
    ],
  };
}

function getStandingScore(leagueStanding) {
  const position = safeNumber(leagueStanding?.position);

  if (!position) {
    return 58;
  }

  if (position <= 4) {
    return 86;
  }
  if (position <= 7) {
    return 76;
  }
  if (position <= 12) {
    return 67;
  }
  return 56;
}

function computeTeamNeedScore(player, targetTeamContext = null) {
  if (!targetTeamContext?.squad?.length) {
    return {
      score: 58,
      summary: "Takım kadro verisi bulunamadığı için standart gereksinim puanı kullanıldı.",
      peerComparison: null,
    };
  }

  const playerSignals = buildPlayerSignals(player);
  const sameRolePlayers = targetTeamContext.squad.filter(
    (member) => getPositionGroup(member) === playerSignals.positionGroup
  );
  const comparisonPool = sameRolePlayers.length ? sameRolePlayers : targetTeamContext.squad;

  const avgRating = average(comparisonPool.map((member) => safeNumber(member.statistics?.rating, 6.4)));
  const avgContribution = average(
    comparisonPool.map(
      (member) =>
        safeNumber(member.statistics?.goals) + safeNumber(member.statistics?.assists)
    )
  );
  const playerContribution = playerSignals.goals + playerSignals.assists;
  const playerDeltaScore = clamp(
    58 +
      (playerSignals.rating - avgRating) * 15 +
      (playerContribution - avgContribution) * 5 +
      (comparisonPool.length <= 2 ? 8 : 0)
  );

  return {
    score: round(playerDeltaScore),
    summary:
      playerDeltaScore >= 74
        ? "Oyuncu aynı rol grubunda hedef kadroya doğrudan kalite artışı sağlayabilir."
        : playerDeltaScore >= 62
        ? "Oyuncu hedef kadroda rekabeti artıracak seviyede görünüyor."
        : "Oyuncu hedef kadronun mevcut rol dağılımına yakın bir seviyede kalabilir.",
    peerComparison: {
      groupSize: comparisonPool.length,
      avgRating: round(avgRating),
      avgContribution: round(avgContribution),
      playerContribution: round(playerContribution),
    },
  };
}

function computeTeamEnvironmentScore(targetTeamContext = null) {
  if (!targetTeamContext?.team) {
    return {
      score: 60,
      summary: "Takım ortam puanı varsayılan kulüp seviyesiyle hesaplandı.",
    };
  }

  const standingScore = getStandingScore(targetTeamContext.team.leagueStanding);
  const transferVolume = safeNumber(targetTeamContext.transferHistory?.length);
  const squadDepth = safeNumber(targetTeamContext.squad?.length);
  const environmentScore = clamp(
    standingScore * 0.58 + Math.min(80, squadDepth * 2.1) * 0.22 + Math.min(78, transferVolume * 5 + 42) * 0.2
  );

  return {
    score: round(environmentScore),
    summary:
      standingScore >= 76
        ? "Takım üst sıra hedefleri olan daha rekabetçi bir ortama sahip."
        : standingScore >= 62
        ? "Takım orta-üst segmentte ve rol kazanımı için dengeli bir ortam sunuyor."
        : "Takım yeniden yapılanma veya alt sıra baskısı altında olabilir.",
  };
}

function getContractScore(contractMonthsRemaining) {
  if (contractMonthsRemaining === null) {
    return 56;
  }
  if (contractMonthsRemaining <= 6) {
    return 88;
  }
  if (contractMonthsRemaining <= 12) {
    return 76;
  }
  if (contractMonthsRemaining <= 24) {
    return 62;
  }
  return 48;
}

function scoreTeamFit(player, team, context = {}) {
  const contractMonthsRemaining = resolveContractMonthsRemaining(context);
  const leagueFit = scoreLeagueFit(player, team.league || context.preferredLeague);
  const trendSignals = getMarketTrendSignals(team, context.trendReport);
  const teamNeed = computeTeamNeedScore(
    player,
    context.targetTeamContext &&
      Number(context.targetTeamContext.team?.id) === Number(team.id)
      ? context.targetTeamContext
      : null
  );
  const teamEnvironment = computeTeamEnvironmentScore(
    context.targetTeamContext &&
      Number(context.targetTeamContext.team?.id) === Number(team.id)
      ? context.targetTeamContext
      : null
  );
  const contractScore = getContractScore(contractMonthsRemaining);
  const marketScore = clamp(
    52 + trendSignals.clubTrendScore * 1.9 + trendSignals.leagueTrendScore * 2.3
  );

  const probabilityScore = round(
    leagueFit.score * 0.48 +
      teamNeed.score * 0.18 +
      teamEnvironment.score * 0.12 +
      contractScore * 0.1 +
      marketScore * 0.12
  );

  return {
    probabilityScore: clamp(probabilityScore),
    trendSignals,
    leagueFit,
    teamNeed,
    teamEnvironment,
    contractScore,
    marketScore: round(marketScore),
  };
}

function getCompatibilityLabel(score) {
  if (score >= 82) {
    return "Cok yuksek";
  }
  if (score >= 68) {
    return "Yuksek";
  }
  if (score >= 54) {
    return "Orta";
  }
  return "Dusuk";
}

function buildBasedOn(player, context, contractMonthsRemaining) {
  return {
    age: player.age,
    currentTeam: player.team?.name || null,
    currentLeague: player.team?.league || player.league || null,
    statistics: player.statistics,
    contract: {
      monthsRemaining: contractMonthsRemaining,
      endDate: context.contractEndDate || null,
    },
    marketTrendSummary: context.trendReport
      ? {
          averageFee: context.trendReport.summary?.averageFee || 0,
          hottestClubs: (context.trendReport.topDestinationClubs || [])
            .slice(0, 3)
            .map((item) => item.club),
          hottestLeagues: (context.trendReport.topDestinationLeagues || [])
            .slice(0, 3)
            .map((item) => item.league),
        }
      : null,
  };
}

function buildPredictionRationale(player, candidate, contractMonthsRemaining) {
  const signals = buildPlayerSignals(player);

  return {
    performanceScore: round(
      signals.rating * 5 +
        signals.goals * 0.8 +
        signals.assists * 0.65 +
        signals.appearances * 0.4
    ),
    contractPressure:
      contractMonthsRemaining === null
        ? "unknown"
        : contractMonthsRemaining <= 12
        ? "high"
        : contractMonthsRemaining <= 24
        ? "medium"
        : "low",
    marketHeat: round(candidate.marketScore),
    leagueFit: round(candidate.leagueFit.score),
    teamNeed: round(candidate.teamNeed.score),
  };
}

function buildPredictionNarrative(playerName, candidate, targetName) {
  const strongestFactor = [...candidate.leagueFit.factors]
    .sort((left, right) => right.score - left.score)[0];

  return {
    headline: `${playerName} için ${targetName} uyumu ${getCompatibilityLabel(
      candidate.probabilityScore
    ).toLowerCase()} seviyede.`,
    summary: `${targetName} için lig profili, kadro ihtiyacı ve pazar hareketleri birlikte analiz edildi.`,
    reasons: [
      strongestFactor
        ? `${strongestFactor.label} en belirgin olumlu alan olarak öne çıkıyor.`
        : "Lig stili karşılaştırması temel faktörü oluşturdu.",
      candidate.teamNeed.summary,
      candidate.teamEnvironment.summary,
    ],
    factors: [
      {
        label: "Lig uyumu",
        score: round(candidate.leagueFit.score),
        detail: candidate.leagueFit.profile.summary,
      },
      {
        label: "Takım ihtiyacı",
        score: round(candidate.teamNeed.score),
        detail: candidate.teamNeed.summary,
      },
      {
        label: "Kulüp ortamı",
        score: round(candidate.teamEnvironment.score),
        detail: candidate.teamEnvironment.summary,
      },
      {
        label: "Pazar sıcaklığı",
        score: round(candidate.marketScore),
        detail: "Transfer trendleri ve hedef pazar yoğunluğu hesaba katıldı.",
      },
      {
        label: "Sözleşme baskısı",
        score: round(candidate.contractScore),
        detail: "Mevcut sözleşme süresi transfer olasılığına etki edecek şekilde değerlendirildi.",
      },
    ],
  };
}

function buildLeaguePreviewNarrative(playerName, candidate, leagueName) {
  const baseNarrative = buildPredictionNarrative(
    playerName,
    candidate,
    leagueName
  );

  return {
    ...baseNarrative,
    headline: `${playerName} için ${leagueName || "hedef lig"} taraması ${getCompatibilityLabel(
      candidate.probabilityScore
    ).toLowerCase()} seviyede.`,
    summary:
      `${leagueName || "Hedef lig"} içinde kulüp adayları hızlı tarama modeliyle sıralandı. ` +
      "Takım seçildiğinde kulüp uyumu yeniden ve daha detaylı hesaplanır.",
    reasons: [
      `${candidate.teamName} şu an için lig içindeki öne çıkan aday olarak görünüyor.`,
      "Bu görünüm kulüp bazlı detay kadro analizi olmadan, lig tarama skoru ile üretildi.",
      "Kesin kulüp karşılaştırması için hedef takım seçildiğinde skor yeniden hesaplanır.",
    ],
  };
}

function generateTransferPrediction(player, teams, context = {}) {
  const contractMonthsRemaining = resolveContractMonthsRemaining(context);
  const basedOn = buildBasedOn(player, context, contractMonthsRemaining);
  const candidates = teams
    .map((team) => {
      const teamFit = scoreTeamFit(player, team, context);

      return {
        teamId: team.id,
        teamName: team.name,
        league: team.league,
        probabilityScore: round(teamFit.probabilityScore),
        trendSignals: teamFit.trendSignals,
        teamNeed: teamFit.teamNeed,
        teamEnvironment: teamFit.teamEnvironment,
        leagueFit: teamFit.leagueFit,
        contractScore: teamFit.contractScore,
        marketScore: teamFit.marketScore,
      };
    })
    .sort((a, b) => b.probabilityScore - a.probabilityScore);

  if (context.targetTeamId) {
    const selectedCandidate = candidates.find(
      (candidate) => Number(candidate.teamId) === Number(context.targetTeamId)
    );

    if (!selectedCandidate) {
      return {
        mode: "team",
        playerId: player.id,
        playerName: player.name,
        generatedAt: new Date().toISOString(),
        basedOn,
        targetLeague: context.preferredLeague || null,
        target: null,
        compatibility: {
          score: 0,
          percentage: 0,
          label: "Hedef bulunamadı",
        },
        rationale: null,
        analysis: null,
      };
    }

    const percentage = Math.round(selectedCandidate.probabilityScore);

    return {
      mode: "team",
      playerId: player.id,
      playerName: player.name,
      generatedAt: new Date().toISOString(),
      basedOn,
      targetLeague: selectedCandidate.league || context.preferredLeague || null,
      target: {
        teamId: selectedCandidate.teamId,
        teamName: selectedCandidate.teamName,
        league: selectedCandidate.league || null,
      },
      compatibility: {
        score: percentage,
        percentage,
        label: getCompatibilityLabel(percentage),
      },
      rationale: buildPredictionRationale(
        player,
        selectedCandidate,
        contractMonthsRemaining
      ),
      analysis: buildPredictionNarrative(
        player.name,
        selectedCandidate,
        selectedCandidate.teamName
      ),
    };
  }

  const topCandidates = candidates.slice(0, 3);
  const leagueScore = topCandidates.length
    ? Math.round(
        topCandidates.reduce((sum, candidate) => sum + candidate.probabilityScore, 0) /
          topCandidates.length
      )
    : 0;
  const topCandidate = topCandidates[0] || null;

  return {
    mode: "league",
    playerId: player.id,
    playerName: player.name,
    generatedAt: new Date().toISOString(),
    basedOn,
    targetLeague: context.preferredLeague || null,
    previewMode: "league-scan",
    previewNote:
      "Takım seçilmediği için kulüp adayları hızlı lig taraması ile sıralandı. " +
      "Hedef takım seçildiğinde kulüp skoru yeniden hesaplanır.",
    compatibility: {
      score: leagueScore,
      percentage: leagueScore,
      label: getCompatibilityLabel(leagueScore),
    },
    bestFit: topCandidate
      ? {
          teamId: topCandidate.teamId,
          teamName: topCandidate.teamName,
          league: topCandidate.league,
          isPreview: true,
        }
      : null,
    analysis: topCandidate
      ? buildLeaguePreviewNarrative(
          player.name,
          topCandidate,
          context.preferredLeague || "hedef lig"
        )
      : null,
    predictions: topCandidates.map((candidate, index) => ({
      rank: index + 1,
      teamId: candidate.teamId,
      teamName: candidate.teamName,
      league: candidate.league,
      probability: Number((candidate.probabilityScore / 100).toFixed(2)),
      rationale: buildPredictionRationale(player, candidate, contractMonthsRemaining),
      factors: buildPredictionNarrative(player.name, candidate, candidate.teamName).factors,
    })),
  };
}

function getValueOutlookLabel(growthRatio) {
  if (growthRatio >= 1.18) {
    return "Yükselen varlık";
  }
  if (growthRatio >= 1.06) {
    return "İstikrarlı artış";
  }
  if (growthRatio >= 0.95) {
    return "Dengeli seyir";
  }
  return "Aşağı yönlü risk";
}

function getValueConfidence(playerSignals) {
  if (playerSignals.appearances >= 25 && playerSignals.minutes >= 1800) {
    return "Yüksek";
  }
  if (playerSignals.appearances >= 15) {
    return "Orta";
  }
  return "Düşük";
}

function calculatePlayerValueProjection(player) {
  const signals = buildPlayerSignals(player);
  const positionGroup = signals.positionGroup;
  const currentValue = safeNumber(player.marketValue?.current, 5);
  const ageFactor =
    signals.age <= 22 ? 1.18 : signals.age <= 25 ? 1.12 : signals.age <= 28 ? 1.05 : 0.92;
  const formFactor = 1 + Math.min(0.52, signals.momentum / 250);
  const availabilityFactor = 1 + Math.min(0.16, signals.availability / 800);
  const positionPremium =
    positionGroup === "forward"
      ? 1.08
      : positionGroup === "midfielder"
      ? 1.04
      : positionGroup === "defender"
      ? 1.01
      : 0.96;

  const projectedValue = round(
    currentValue * ageFactor * formFactor * availabilityFactor * positionPremium
  );
  const growthRatio = projectedValue / Math.max(currentValue, 0.1);
  const spreadRatio = 0.08 + Math.max(0.03, (30 - Math.min(signals.appearances, 30)) / 220);
  const lowerBound = round(projectedValue * (1 - spreadRatio));
  const upperBound = round(projectedValue * (1 + spreadRatio));
  const outlook = getValueOutlookLabel(growthRatio);
  const confidence = getValueConfidence(signals);

  return {
    playerId: player.id,
    playerName: player.name,
    currentEstimatedValue: {
      amount: currentValue,
      currency: "M EUR",
    },
    projectedValue: {
      amount: projectedValue,
      currency: "M EUR",
      horizon: "12 months",
    },
    valuationBand: {
      low: lowerBound,
      high: upperBound,
      currency: "M EUR",
    },
    outlook,
    confidence,
    summary: `${player.name} için yaş, süreklilik ve üretkenlik birlikte okunduğunda 12 aylık değer eğilimi ${outlook.toLowerCase()} olarak görülüyor.`,
    aiReport: {
      headline: `${player.name} için AI değer tahmini ${projectedValue} M EUR seviyesine işaret ediyor.`,
      summary: `${signals.appearances} maçlık örneklem, ${signals.goals} gol, ${signals.assists} asist ve ${signals.rating} rating verisi modele dahil edildi.`,
      reasons: [
        signals.age <= 25
          ? "Genç yaş profili gelecekteki artış potansiyelini destekliyor."
          : "Yaş profili artık prim artışını sınırlandıran bölgeye yaklaşıyor.",
        signals.availability >= 70
          ? "Süreklilik seviyesi pazarda güven oluşturuyor."
          : "Sınırlı süre verisi tahmin aralığını genişletiyor.",
        signals.momentum >= 75
          ? "Güncel form ve üretkenlik yüksek fiyat bandını destekliyor."
          : "Form eğilimi orta segmentte kalarak daha temkinli bir tahmine neden oluyor.",
      ],
    },
    factors: {
      age: signals.age,
      appearances: signals.appearances,
      minutes: signals.minutes,
      goals: signals.goals,
      assists: signals.assists,
      rating: signals.rating,
      ageFactor: round(ageFactor),
      formFactor: round(formFactor),
      availabilityFactor: round(availabilityFactor),
      positionPremium: round(positionPremium),
    },
  };
}

function getOverallTeamStatus(score) {
  if (score >= 80) {
    return "Güçlü yükseliş profili";
  }
  if (score >= 68) {
    return "Rekabetçi denge";
  }
  if (score >= 56) {
    return "Gelişim açık alanlar var";
  }
  return "Yeniden yapılanma ihtiyacı";
}

function buildTeamStrengths(metrics) {
  const strengths = [];

  if (metrics.averageRating >= 6.9) {
    strengths.push("Kadro ortalama rating seviyesi ligin üst bandına yaklaşıyor.");
  }
  if (metrics.totalGoalContributions >= 35) {
    strengths.push("Kadro genelinde üretilen gol katkısı sağlıklı bir seviyede.");
  }
  if (metrics.squadDepth >= 22) {
    strengths.push("Rotasyon derinliği yoğun fikstüre dayanabilecek bir taban sunuyor.");
  }
  if (metrics.leagueStandingScore >= 76) {
    strengths.push("Lig konumu takımın rekabet seviyesini yukarı çekiyor.");
  }
  if (!strengths.length) {
    strengths.push("Takım için dengeli ancak belirginleşmesi gereken güçlü yönler mevcut.");
  }

  return strengths;
}

function buildTeamRisks(metrics) {
  const risks = [];

  if (metrics.averageAge >= 28.5) {
    risks.push("Ortalama yaş yüksek, kadro yenilenme baskısı artabilir.");
  }
  if (metrics.averageRating < 6.6) {
    risks.push("Performans ortalaması üst seviye rekabet için yeterince yüksek görünmüyor.");
  }
  if (metrics.totalGoalContributions < 22) {
    risks.push("Skor katkısı sınırlı olduğu için yaratıcılık transfer ihtiyacı doğabilir.");
  }
  if (metrics.transferBalance < -2) {
    risks.push("Son transfer hareketleri çıkış ağırlıklı, kadro bütünlüğü zayıflayabilir.");
  }
  if (!risks.length) {
    risks.push("Takımda kritik bir alarm yok ancak role özel kalite artışı hâlâ fayda sağlayabilir.");
  }

  return risks;
}

function buildTeamRecommendations(metrics) {
  const recommendations = [];

  if (metrics.averageAge >= 28) {
    recommendations.push("23-25 yaş bandında dinamik oyuncularla ömür döngüsü dengelenebilir.");
  }
  if (metrics.totalGoalContributions < 30) {
    recommendations.push("Son üçte sonlandırıcılık veya son pas kalitesi artıran profiller hedeflenmeli.");
  }
  if (metrics.averageRating < 6.8) {
    recommendations.push("İlk 11 çekirdeğine direkt katkılı bir iki oyuncu eklemesi etkili olabilir.");
  }
  if (metrics.transferBalance > 2) {
    recommendations.push("Yeni gelen oyuncuların entegrasyonu için rol netliği korunmalı.");
  }
  if (!recommendations.length) {
    recommendations.push("Mevcut iskelet korunup nokta atışı tamamlayıcı takviyeler düşünülebilir.");
  }

  return recommendations;
}

function buildTeamAiReport(team, squad = [], transferHistory = []) {
  const ages = squad.map((player) => safeNumber(player.age)).filter(Boolean);
  const ratings = squad
    .map((player) => safeNumber(player.statistics?.rating))
    .filter((rating) => rating > 0);
  const totalGoals = squad.reduce(
    (sum, player) => sum + safeNumber(player.statistics?.goals),
    0
  );
  const totalAssists = squad.reduce(
    (sum, player) => sum + safeNumber(player.statistics?.assists),
    0
  );
  const incomingTransfers = transferHistory.filter(
    (transfer) => Number(transfer.toTeamId) === Number(team.id)
  ).length;
  const outgoingTransfers = transferHistory.filter(
    (transfer) => Number(transfer.fromTeamId) === Number(team.id)
  ).length;
  const leagueStandingScore = getStandingScore(team.leagueStanding);
  const squadDepth = squad.length;
  const averageAge = round(average(ages), 1);
  const averageRating = round(average(ratings), 2);
  const totalGoalContributions = totalGoals + totalAssists;
  const balanceScore = clamp(
    averageRating * 10.5 +
      Math.min(22, squadDepth) * 1.2 +
      Math.min(35, totalGoalContributions) * 0.7 +
      leagueStandingScore * 0.24
  );
  const transferBalance = incomingTransfers - outgoingTransfers;
  const overallScore = round(
    balanceScore * 0.38 +
      leagueStandingScore * 0.24 +
      clamp(78 - Math.abs(averageAge - 26) * 6) * 0.14 +
      Math.min(80, squadDepth * 2.6) * 0.12 +
      Math.min(82, (incomingTransfers + outgoingTransfers) * 5 + 35) * 0.12
  );

  const metrics = {
    squadDepth,
    averageAge,
    averageRating,
    totalGoals,
    totalAssists,
    totalGoalContributions,
    incomingTransfers,
    outgoingTransfers,
    transferBalance,
    leagueStandingScore,
  };

  return {
    teamId: team.id,
    teamName: team.name,
    generatedAt: new Date().toISOString(),
    overallScore: clamp(overallScore),
    status: getOverallTeamStatus(overallScore),
    summary: `${team.name} için kadro derinliği, performans ortalaması, transfer hareketleri ve lig konumu birleştirilerek AI takım raporu üretildi.`,
    narrative: {
      headline: `${team.name} profili ${getOverallTeamStatus(overallScore).toLowerCase()} kategorisinde görünüyor.`,
      summary:
        team.leagueStanding?.position
          ? `Takım ligde ${team.leagueStanding.position}. sırada ve kadro verileri bunun ${overallScore >= 68 ? "desteklendiğini" : "baskı altında olduğunu"} gösteriyor.`
          : "Lig sıralaması olmadan kadro ve transfer verileri temel alındı.",
      strengths: buildTeamStrengths(metrics),
      risks: buildTeamRisks(metrics),
      recommendations: buildTeamRecommendations(metrics),
    },
    metrics: {
      squadDepth,
      averageAge,
      averageRating,
      totalGoals,
      totalAssists,
      incomingTransfers,
      outgoingTransfers,
      transferBalance,
      leaguePosition: team.leagueStanding?.position || null,
      leaguePoints: team.leagueStanding?.points || null,
    },
  };
}

function buildTransferTrendReport(transfers) {
  const totalTransfers = transfers.length;
  const feeValues = transfers
    .map((transfer) => Number(transfer.amount || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  const averageFee = feeValues.length
    ? Number((feeValues.reduce((sum, value) => sum + value, 0) / feeValues.length).toFixed(2))
    : 0;

  const topDestinationClubs = Object.entries(
    transfers.reduce((acc, transfer) => {
      if (transfer.toTeam) {
        acc[transfer.toTeam] = (acc[transfer.toTeam] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([club, count]) => ({ club, count }));

  const topDestinationLeagues = Object.entries(
    transfers.reduce((acc, transfer) => {
      if (transfer.toLeague) {
        acc[transfer.toLeague] = (acc[transfer.toLeague] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([league, count]) => ({ league, count }));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalTransfers,
      averageFee,
      currency: "EUR",
    },
    insights: [
      `${totalTransfers} transfer kaydi analiz edildi.`,
      `Ortalama bonservis bedeli ${averageFee} olarak hesaplandi.`,
      "Ust siradaki hedef kulup ve lig listeleri trend raporuna eklendi.",
    ],
    topDestinationClubs,
    topDestinationLeagues,
  };
}

module.exports = {
  buildTeamAiReport,
  calculatePlayerValueProjection,
  generateTransferPrediction,
  buildTransferTrendReport,
};
