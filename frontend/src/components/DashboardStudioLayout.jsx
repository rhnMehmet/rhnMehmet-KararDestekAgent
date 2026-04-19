import { useMemo } from "react";
import { getEntityImage, getLeagueLogo } from "../services/brandAssets";
import { formatEntityText } from "../services/textFormatter";

const MOJIBAKE_REPLACEMENTS = [
  ["ÃƒÂ¼", "ü"],
  ["ÃƒÅ“", "Ü"],
  ["ÃƒÂ¶", "ö"],
  ["Ãƒâ€“", "Ö"],
  ["ÃƒÂ§", "ç"],
  ["Ãƒâ€¡", "Ç"],
  ["Ã„Â±", "ı"],
  ["Ã„Â°", "İ"],
  ["Ã…Å¸", "ş"],
  ["Ã…Å¾", "Ş"],
  ["Ã„Å¸", "ğ"],
  ["Ã„Å¾", "Ğ"],
  ["Ã¢â€ â€™", "→"],
  ["Ã¢â‚¬Â¢", "•"],
  ["Ã¢â‚¬â„¢", "'"],
  ['Ã¢â‚¬Å“', '"'],
  ['Ã¢â‚¬Â', '"'],
  ["Ã¢â‚¬â€œ", "-"],
  ["Ã¢â‚¬â€", "-"],
  ["Ã‚", ""],
];

const QUESTION_REPLACEMENTS = [
  ["G?ncel", "Güncel"],
  ["?retkenlik", "üretkenlik"],
  ["y?ksek", "yüksek"],
  ["band?n?", "bandını"],
  ["i?in", "için"],
  ["Gen?", "Genç"],
  ["ya?", "yaş"],
  ["g?r?l?yor", "görülüyor"],
  ["S?n?rl?", "Sınırlı"],
  ["geni?letiyor", "genişletiyor"],
  ["s?re", "süre"],
];

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function trimNumber(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return numeric.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function formatMillionValue(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return `${trimNumber(numeric)} M EUR`;
}

function sanitizeDisplayText(value) {
  if (value == null || value === "") {
    return "";
  }

  let formatted = formatEntityText(String(value));

  for (const [source, target] of MOJIBAKE_REPLACEMENTS) {
    formatted = formatted.replaceAll(source, target);
  }

  for (const [source, target] of QUESTION_REPLACEMENTS) {
    formatted = formatted.replaceAll(source, target);
  }

  return formatted;
}

function getNameInitials(value) {
  const words = sanitizeDisplayText(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) {
    return "TR";
  }

  return words.map((word) => word[0]).join("").toUpperCase();
}

function formatStars(rating) {
  const safeRating = clamp(Number(rating) || 0, 0, 5);
  return `${"★".repeat(safeRating)}${"☆".repeat(5 - safeRating)}`;
}

function mapConfidenceScore(confidence) {
  const text = sanitizeDisplayText(confidence).toLowerCase();

  if (text.includes("yüksek")) {
    return 84;
  }

  if (text.includes("orta")) {
    return 68;
  }

  if (text.includes("düşük")) {
    return 46;
  }

  return 60;
}

export default function DashboardStudioLayout({
  profile,
  feedback,
  favoriteCount,
  selectedLeague,
  setSelectedLeague,
  leagues,
  leagueRouteMap,
  navigate,
  onLogout,
  aiSourceLeague,
  setAiSourceLeague,
  aiPlayerSearch,
  setAiPlayerSearch,
  openAiPicker,
  setOpenAiPicker,
  loadingAiPlayers,
  loadingPrediction,
  selectedPlayer,
  selectedPlayerId,
  setSelectedPlayerId,
  visibleAiPlayers,
  aiTargetLeague,
  setAiTargetLeague,
  aiTargetTeamId,
  setAiTargetTeamId,
  aiTargetTeamSearch,
  setAiTargetTeamSearch,
  loadingAiTeams,
  selectedAiTargetTeam,
  visibleAiTargetTeams,
  data,
  formatContractPressure,
}) {
  const compatibilityPercentage = clamp(
    data?.prediction?.compatibility?.percentage ?? data?.prediction?.compatibility?.score ?? 0
  );
  const selectedPlayerImage = getEntityImage(selectedPlayer);
  const selectedPlayerName = sanitizeDisplayText(
    selectedPlayer?.name || data?.prediction?.playerName || "Oyuncu seç"
  );
  const targetName = sanitizeDisplayText(
    data?.prediction?.mode === "team"
      ? data?.prediction?.target?.teamName || "Hedef kulüp"
      : data?.prediction?.targetLeague || "Hedef lig"
  );
  const targetLeagueLabel = sanitizeDisplayText(
    data?.prediction?.mode === "team"
      ? data?.prediction?.target?.league || "Kulüp hedefi"
      : "Kulüp karşılaştırması için hedef takım seç"
  );
  const compatibilityLabel = sanitizeDisplayText(
    data?.prediction?.compatibility?.label || "Hazırlanıyor"
  );
  const predictionSummary = sanitizeDisplayText(
    (data?.prediction?.mode === "league"
      ? "Takım seçilmediği için yalnızca lig uyumu gösteriliyor. Kulüp önerisi ancak hedef takım seçildiğinde hesaplanır."
      : null) ||
      data?.prediction?.previewNote ||
      data?.prediction?.analysis?.summary ||
      (loadingPrediction ? "AI analiz hazırlanıyor." : "AI analiz verisi bekleniyor.")
  );
  const currentValue = Number(data?.valuePrediction?.currentEstimatedValue?.amount || 0);
  const projectedValue = Number(data?.valuePrediction?.projectedValue?.amount || 0);
  const growthPercent = currentValue
    ? Math.round(((projectedValue - currentValue) / currentValue) * 100)
    : 0;

  const spotlightFactors = useMemo(() => {
    const factors = Array.isArray(data?.prediction?.analysis?.factors)
      ? data.prediction.analysis.factors
      : [];

    return factors.slice(0, 3).map((factor) => ({
      label: sanitizeDisplayText(factor.label),
      value: `${Math.round(Number(factor.score) || 0)}%`,
      detail: sanitizeDisplayText(factor.detail),
    }));
  }, [data?.prediction?.analysis?.factors]);

  const analysisCards = useMemo(() => {
    const predictionFactors = Array.isArray(data?.prediction?.analysis?.factors)
      ? data.prediction.analysis.factors
      : [];
    const cards = predictionFactors.map((factor, index) => ({
      id: `${sanitizeDisplayText(factor.label)}-${index}`,
      label: sanitizeDisplayText(factor.label),
      score: Math.round(Number(factor.score) || 0),
      detail: sanitizeDisplayText(factor.detail),
    }));

    cards.push(
      {
        id: "piyasa-etkisi",
        label: "Piyasa değeri etkisi",
        score: clamp(50 + growthPercent, 0, 100),
        detail:
          growthPercent >= 0
            ? `12 ay projeksiyonu +%${growthPercent} potansiyel gösteriyor.`
            : `12 ay projeksiyonu %${growthPercent} risk sinyali veriyor.`,
      },
      {
        id: "guven-seviyesi",
        label: "Güven seviyesi",
        score: mapConfidenceScore(data?.valuePrediction?.confidence),
        detail: sanitizeDisplayText(
          data?.valuePrediction?.confidence || "Model dengeli güven seviyesi üretiyor."
        ),
      }
    );

    if (!cards.length) {
      cards.push(
        {
          id: "hazirlik-1",
          label: "Lig uyumu",
          score: 72,
          detail: "Oyuncu seçildiğinde AI uyum analizi burada görünür.",
        },
        {
          id: "hazirlik-2",
          label: "Taktik farkındalık",
          score: 69,
          detail: "Hedef lig ve takım seçimine göre yeni skorlar hazırlanır.",
        }
      );
    }

    return cards.slice(0, 6);
  }, [
    data?.prediction?.analysis?.factors,
    data?.valuePrediction?.confidence,
    growthPercent,
  ]);

  const marketReasons = useMemo(() => {
    const reasons = data?.valuePrediction?.aiReport?.reasons || [];
    return reasons.slice(0, 3).map((reason) => sanitizeDisplayText(reason));
  }, [data?.valuePrediction?.aiReport?.reasons]);

  const visibleComments = useMemo(() => data?.comments || [], [data?.comments]);

  const chartPoints = useMemo(() => {
    const safeCurrent = currentValue || 12;
    const safeProjected = projectedValue || Math.max(safeCurrent * 1.12, 14);
    const values = [
      safeCurrent * 0.72,
      safeCurrent * 0.91,
      safeCurrent,
      safeCurrent + (safeProjected - safeCurrent) * 0.42,
      safeCurrent + (safeProjected - safeCurrent) * 0.68,
      safeProjected,
    ];
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = Math.max(maxValue - minValue, 1);

    return values
      .map((value, index) => {
        const x = 16 + index * 40;
        const y = 110 - ((value - minValue) / range) * 74;
        return `${x},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [currentValue, projectedValue]);

  function handleSourceLeagueChange(league) {
    setAiSourceLeague(league);
  }

  function handleQuickLeagueNavigate(league) {
    setSelectedLeague(league);
    const leagueSlug = leagueRouteMap?.[league];

    if (leagueSlug) {
      navigate(`/leagues/${leagueSlug}`);
    }
  }

  const fallbackFactors = [
    {
      label: "Lig uyumu",
      value: `${compatibilityPercentage}%`,
      detail: "AI sonuçları geldiğinde detaylı lig profili burada görünür.",
    },
    {
      label: "Takım ihtiyacı",
      value: `${Math.max(compatibilityPercentage - 8, 0)}%`,
      detail: "Hedef kulüp seçildiğinde kadro ihtiyacı değerlendirilir.",
    },
    {
      label: "Kulüp ortamı",
      value: `${Math.min(compatibilityPercentage + 5, 100)}%`,
      detail: "Pazar trendleri ve kulüp seviyesi eşleştirilir.",
    },
  ];

  const fallbackMarketReasons = [
    "Genç yaş profili gelecekteki artış potansiyelini destekliyor.",
    "Süreklilik seviyesi AI bandının güvenini artırıyor.",
    "Form ivmesi yükseldiğinde piyasa değeri daha hızlı tepki veriyor.",
  ];

  return (
    <main className="dashboard-page dashboard-page-neo">
      <header className="dashboard-command-bar">
        <div className="dashboard-command-brand">
          <div className="dashboard-command-logo">T</div>
          <div className="dashboard-command-copy">
            <strong>Transfera</strong>
            <span>Football Market Analysis</span>
          </div>
        </div>

        <div className="dashboard-command-actions">
          <div className="dashboard-command-welcome">
            <span>Welcome</span>
            <strong>{sanitizeDisplayText(profile?.name || "User")}</strong>
          </div>
          <button className="dashboard-command-button" onClick={() => navigate("/comments")}>
            Yorumlar
          </button>
          <button className="dashboard-command-button" onClick={() => navigate("/favorites")}>
            Favoriler
          </button>
          <button className="dashboard-command-button" onClick={() => navigate("/profile")}>
            Profil
          </button>
          {profile?.role === "admin" ? (
            <button className="dashboard-command-button" onClick={() => navigate("/admin")}>
              Admin
            </button>
          ) : null}
          <button className="dashboard-command-button dashboard-command-exit" onClick={onLogout}>
            Çıkış Yap
          </button>
        </div>
      </header>

      <section className="dashboard-studio-layout">
        <div className="dashboard-main-column">
          <section className="studio-panel studio-simulator-panel">
            <div className="studio-panel-head">
              <div>
                <p className="eyebrow eyebrow-muted">Transfer Simulator</p>
                <h1>Oyuncunun hedef lig veya takıma uyum ölçümü</h1>
                <p>
                  Referans görselin akışına uygun olarak AI uyum, detay analizi ve
                  seçtiğin oyuncuya ait yorumlar aynı çalışma alanında toplandı.
                </p>
              </div>
            </div>

            {feedback ? (
              <div className="studio-feedback-banner">{sanitizeDisplayText(feedback)}</div>
            ) : null}

            <div className="studio-simulator-top">
              <div className="studio-compatibility-surface">
                <div
                  className="studio-compatibility-ring"
                  style={{ "--progress": `${compatibilityPercentage}%` }}
                >
                  <div className="studio-compatibility-core">
                    <strong>{compatibilityPercentage}%</strong>
                    <span>{loadingPrediction ? "Hazırlanıyor" : compatibilityLabel}</span>
                  </div>
                </div>

                <div className="studio-compatibility-copy">
                  <p>Oyuncu uyumu</p>
                  <h2>{sanitizeDisplayText(aiTargetLeague)}</h2>
                  <span>{predictionSummary}</span>
                </div>
              </div>

              <div className="studio-player-focus-card">
                <div className="studio-player-avatar">
                  {selectedPlayerImage ? (
                    <img src={selectedPlayerImage} alt={selectedPlayerName} />
                  ) : (
                    getNameInitials(selectedPlayerName)
                  )}
                </div>
                <div className="studio-player-copy">
                  <p>Seçili oyuncu</p>
                  <h3>{selectedPlayerName}</h3>
                  <span>
                    {sanitizeDisplayText(
                      selectedPlayer?.team?.name ||
                        selectedPlayer?.teamName ||
                        "Takım bilgisi bekleniyor"
                    )}
                  </span>
                </div>
                <div className="studio-player-target">
                  <small>Hedef</small>
                  <strong>{targetName}</strong>
                  <span>{targetLeagueLabel}</span>
                </div>
              </div>
            </div>

            <div className="studio-factor-strip">
              {(spotlightFactors.length ? spotlightFactors : fallbackFactors).map((factor) => (
                <article className="studio-factor-card" key={factor.label}>
                  <span>{factor.label}</span>
                  <strong>{factor.value}</strong>
                  <p>{factor.detail}</p>
                </article>
              ))}
            </div>

            <div className="studio-control-grid">
              <article className="studio-control-card">
                <span className="studio-control-label">Kaynak lig</span>
                <div className="studio-chip-row">
                  {leagues.map((league) => (
                    <button
                      key={league}
                      type="button"
                      className={`studio-chip ${aiSourceLeague === league ? "studio-chip-active" : ""}`}
                      onClick={() => handleSourceLeagueChange(league)}
                    >
                      {league}
                    </button>
                  ))}
                </div>
              </article>

              <article
                className={`studio-control-card studio-picker-card ${
                  openAiPicker === "player" ? "studio-picker-card-open" : ""
                }`}
              >
                <span className="studio-control-label">Oyuncu seç</span>
                <button
                  type="button"
                  className="studio-picker-trigger"
                  onClick={() => setOpenAiPicker(openAiPicker === "player" ? null : "player")}
                >
                  <div>
                    <strong>{selectedPlayerName}</strong>
                    <span>
                      {sanitizeDisplayText(
                        selectedPlayer?.team?.name || "Oyuncu havuzunu incele"
                      )}
                    </span>
                  </div>
                  <i>+</i>
                </button>

                {openAiPicker === "player" ? (
                  <div className="studio-picker-popover">
                    <input
                      className="input studio-picker-search"
                      placeholder="Oyuncu ara"
                      value={aiPlayerSearch}
                      onChange={(event) => setAiPlayerSearch(event.target.value)}
                    />
                    <div className="studio-picker-list">
                      {loadingAiPlayers ? (
                        <p className="studio-empty-note">Oyuncular yükleniyor...</p>
                      ) : visibleAiPlayers.length ? (
                        visibleAiPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            className={`studio-picker-item ${
                              Number(player.id) === Number(selectedPlayerId)
                                ? "studio-picker-item-active"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedPlayerId(player.id);
                              setOpenAiPicker(null);
                            }}
                          >
                            <strong>{sanitizeDisplayText(player.name)}</strong>
                            <span>
                              {sanitizeDisplayText(
                                player.team?.name || player.teamName || "Kulüp bilgisi yok"
                              )}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="studio-empty-note">Bu filtrede oyuncu bulunamadı.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>

              <article className="studio-control-card">
                <span className="studio-control-label">Hedef lig</span>
                <div className="studio-chip-row">
                  {leagues.map((league) => (
                    <button
                      key={league}
                      type="button"
                      className={`studio-chip ${aiTargetLeague === league ? "studio-chip-active" : ""}`}
                      onClick={() => setAiTargetLeague(league)}
                    >
                      {league}
                    </button>
                  ))}
                </div>
              </article>

              <article
                className={`studio-control-card studio-picker-card ${
                  openAiPicker === "team" ? "studio-picker-card-open" : ""
                }`}
              >
                <span className="studio-control-label">Hedef takım</span>
                <button
                  type="button"
                  className="studio-picker-trigger"
                  onClick={() => setOpenAiPicker(openAiPicker === "team" ? null : "team")}
                >
                  <div>
                    <strong>
                      {sanitizeDisplayText(selectedAiTargetTeam?.name || "Sadece lig uyumu")}
                    </strong>
                    <span>{sanitizeDisplayText(aiTargetLeague)}</span>
                  </div>
                  <i>+</i>
                </button>

                {openAiPicker === "team" ? (
                  <div className="studio-picker-popover">
                    <input
                      className="input studio-picker-search"
                      placeholder="Takım ara"
                      value={aiTargetTeamSearch}
                      onChange={(event) => setAiTargetTeamSearch(event.target.value)}
                    />
                    <div className="studio-picker-list">
                      <button
                        type="button"
                        className={`studio-picker-item ${!aiTargetTeamId ? "studio-picker-item-active" : ""}`}
                        onClick={() => {
                          setAiTargetTeamId("");
                          setOpenAiPicker(null);
                        }}
                      >
                        <strong>Sadece lig uyumu</strong>
                        <span>Hedef takım seçmeden devam et</span>
                      </button>

                      {loadingAiTeams ? (
                        <p className="studio-empty-note">Takımlar yükleniyor...</p>
                      ) : visibleAiTargetTeams.length ? (
                        visibleAiTargetTeams.slice(0, 16).map((team) => (
                          <button
                            key={team.id}
                            type="button"
                            className={`studio-picker-item ${
                              String(team.id) === String(aiTargetTeamId)
                                ? "studio-picker-item-active"
                                : ""
                            }`}
                            onClick={() => {
                              setAiTargetTeamId(team.id);
                              setOpenAiPicker(null);
                            }}
                          >
                            <strong>{sanitizeDisplayText(team.name)}</strong>
                            <span>{sanitizeDisplayText(team.league || aiTargetLeague)}</span>
                          </button>
                        ))
                      ) : (
                        <p className="studio-empty-note">Bu lig için takım bulunamadı.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            </div>
          </section>

          <section className="studio-panel">
            <div className="studio-section-head">
              <p className="eyebrow eyebrow-muted">Detailed Analysis</p>
              <h2>Detaylı analiz</h2>
            </div>

            <div className="studio-analysis-grid">
              {analysisCards.map((item) => (
                <article className="studio-analysis-card" key={item.id}>
                  <div className="studio-analysis-topline">
                    <span>{item.label}</span>
                    <i className="studio-analysis-dot" />
                  </div>
                  <strong>{item.score}%</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="studio-panel">
            <div className="studio-section-head">
              <p className="eyebrow eyebrow-muted">Selected Player Comments</p>
              <h2>Seçili oyuncu yorumları</h2>
            </div>

            <div className="studio-comments-list">
              {visibleComments.length ? (
                visibleComments.map((comment) => {
                  const commentUserName = sanitizeDisplayText(
                    `${comment.user?.name || "Transfera"} ${
                      comment.user?.surname || "Kullanıcısı"
                    }`
                  ).trim();

                  return (
                    <article
                      className="studio-comment-item"
                      key={comment._id || `${commentUserName}-${comment.createdAt}`}
                    >
                      <div className="studio-comment-user">
                        <div className="studio-comment-avatar">
                          {getNameInitials(commentUserName)}
                        </div>
                        <div className="studio-comment-copy">
                          <strong>{commentUserName}</strong>
                          <span>
                            {sanitizeDisplayText(comment.targetLabel || "Kullanıcı yorumu")}
                          </span>
                          <p>{sanitizeDisplayText(comment.text)}</p>
                        </div>
                      </div>
                      <div className="studio-stars">{formatStars(comment.rating)}</div>
                    </article>
                  );
                })
              ) : (
                <div className="studio-empty-card">
                  <strong>Henüz yorum yok</strong>
                  <p>Bu oyuncu için henüz yorum bulunmuyor. Yeni yorumlar burada listelenecek.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="dashboard-rail">
          <section className="studio-panel studio-quick-panel">
            <div className="studio-section-head">
              <p className="eyebrow eyebrow-muted">Quick League Switching</p>
              <h2>Hızlı lig geçişi</h2>
              <p>
                Ana dashboard odağını tek tıkla değiştir. Aktif lig, simülatördeki oyuncu
                havuzunu da güncelliyor.
              </p>
            </div>

            <div className="studio-quick-grid">
              {leagues.map((league) => (
                <button
                  key={league}
                  type="button"
                  className={`studio-quick-button ${
                    selectedLeague === league ? "studio-quick-button-active" : ""
                  }`}
                  onClick={() => handleQuickLeagueNavigate(league)}
                >
                  {getLeagueLogo(league) ? (
                    <img className="studio-quick-logo" src={getLeagueLogo(league)} alt={league} />
                  ) : (
                    <span className="studio-quick-button-dot" />
                  )}
                  <strong>{league}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="studio-panel studio-market-panel">
            <div className="studio-section-head">
              <p className="eyebrow eyebrow-muted">AI Market Projections</p>
              <h2>AI piyasa projeksiyonu</h2>
            </div>

            <div className="studio-market-chart">
              <div className="studio-market-chart-copy">
                <span>Seçili oyuncu</span>
                <strong>{selectedPlayerName}</strong>
                <small>
                  {sanitizeDisplayText(
                    selectedPlayer?.team?.name || selectedPlayer?.teamName || aiSourceLeague
                  )}
                </small>
              </div>

              <svg
                className="studio-market-svg"
                viewBox="0 0 240 120"
                role="img"
                aria-label="AI market projection line chart"
              >
                <defs>
                  <linearGradient id="studioLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ad5ff" />
                    <stop offset="100%" stopColor="#6f87ff" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="none"
                  stroke="url(#studioLine)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartPoints}
                />
              </svg>
            </div>

            <div className="studio-market-stat-list">
              <article className="studio-market-stat studio-market-stat-trend">
                <span>Mevcut değer</span>
                <strong>
                  {formatMillionValue(data?.valuePrediction?.currentEstimatedValue?.amount)}
                </strong>
              </article>
              <article className="studio-market-stat studio-market-stat-trend">
                <span>12 aylık projeksiyon</span>
                <strong>{formatMillionValue(data?.valuePrediction?.projectedValue?.amount)}</strong>
              </article>
              <article className="studio-market-stat">
                <span>Değer bandı</span>
                <strong>
                  {formatMillionValue(data?.valuePrediction?.valuationBand?.low)} -{" "}
                  {formatMillionValue(data?.valuePrediction?.valuationBand?.high)}
                </strong>
              </article>
              <article className="studio-market-stat studio-market-stat-outlook">
                <span>Trend</span>
                <strong>
                  {sanitizeDisplayText(data?.valuePrediction?.outlook || "Hazırlanıyor")}
                </strong>
              </article>
            </div>

            <div className="studio-market-summary">
              <span>AI özet</span>
              <h3>Oyuncu değer yorumu</h3>
              <p>
                {sanitizeDisplayText(
                  data?.valuePrediction?.summary ||
                    "AI market projection verisi geldiğinde oyuncunun değer eğilimi burada açıklanır."
                )}
              </p>
            </div>

            <div className="studio-market-reasons">
              {(marketReasons.length ? marketReasons : fallbackMarketReasons).map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
            </div>

            <div className="studio-market-footnote">
              <span>Favoriler</span>
              <strong>{favoriteCount} kayıt</strong>
              <small>
                Sözleşme baskısı:{" "}
                {sanitizeDisplayText(
                  formatContractPressure(data?.prediction?.basedOn?.contractPressure)
                )}
              </small>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
