import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api, { storage } from "../services/api";
import { getEntityImage, getInitials } from "../services/brandAssets";
import { inferLeagueCountry } from "../services/leagueUtils";
import { formatEntityText } from "../services/textFormatter";

function clampPercent(value) {
  const numeric = Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildMetricTrend(values = []) {
  const sanitized = values.map((value) => safeNumber(value));
  const maxValue = Math.max(...sanitized, 1);
  const minValue = Math.min(...sanitized, 0);
  const range = Math.max(maxValue - minValue, 1);

  const points = sanitized
    .map((value, index) => {
      const x = 8 + index * 24;
      const y = 58 - ((value - minValue) / range) * 34;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");

  return { points };
}

function formatSignedValue(value) {
  const numeric = safeNumber(value);
  if (numeric > 0) {
    return `+${numeric}`;
  }

  return `${numeric}`;
}

function trimNumber(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return numeric.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function formatTransferCurrency(amount, currency = "EUR") {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "Bedelsiz";
  }

  if (Math.abs(numeric) >= 1_000_000) {
    return `${trimNumber(numeric / 1_000_000)}M ${currency}`;
  }

  if (Math.abs(numeric) >= 1_000) {
    return `${trimNumber(numeric / 1_000)}K ${currency}`;
  }

  return `${trimNumber(numeric)} ${currency}`;
}

export default function TeamDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { teamId } = useParams();
  const [teamData, setTeamData] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [showAllTransfers, setShowAllTransfers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUser = storage.getUser();
  const fallbackLeagueName = location.state?.leagueName || null;
  const returnTo = location.state?.returnTo || null;

  async function loadComments() {
    const commentsResponse = await api.get(`/api/teams/${teamId}/comments?limit=20`);
    setComments(commentsResponse.data.data || []);
  }

  useEffect(() => {
    async function loadTeamDetail() {
      setLoading(true);
      setError("");

      try {
        const leagueQuery = fallbackLeagueName
          ? `?league=${encodeURIComponent(fallbackLeagueName)}`
          : "";
        const [teamResponse, aiResponse] = await Promise.all([
          api.get(`/teams/${teamId}${leagueQuery}`),
          api.get(`/ai/team-report/${teamId}${leagueQuery}`),
        ]);
        setTeamData(teamResponse.data);
        setAiReport(aiResponse.data);
        await loadComments();
      } catch (requestError) {
        setError(
          formatEntityText(requestError.response?.data?.message || "Takım detayları yüklenemedi.")
        );
      } finally {
        setLoading(false);
      }
    }

    loadTeamDetail();
  }, [teamId, fallbackLeagueName]);

  async function handleCreateComment(event) {
    event.preventDefault();

    try {
      await api.post(`/api/teams/${teamId}/comments`, {
        text: commentText,
        rating: commentRating,
      });
      setCommentText("");
      setCommentRating(5);
      await loadComments();
    } catch (requestError) {
      setError(
        formatEntityText(
          requestError.response?.data?.message || "Yorum eklenemedi. Backend kapalı olabilir."
        )
      );
    }
  }

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (returnTo) {
      navigate(returnTo);
      return;
    }

    navigate("/dashboard", { replace: true });
  }

  const resolvedLeague = teamData?.team?.league || fallbackLeagueName || null;
  const resolvedCountry = formatEntityText(
    teamData?.team?.country || inferLeagueCountry(resolvedLeague) || "Ülke bilgisi yok"
  );
  const visibleTransfers = showAllTransfers
    ? teamData?.transferHistory || []
    : (teamData?.transferHistory || []).slice(0, 6);
  const metrics = aiReport?.metrics || {};
  const transferBalance = safeNumber(metrics.transferBalance);

  const overallTrend = buildMetricTrend([
    safeNumber(metrics.leaguePoints, safeNumber(metrics.leaguePosition, 6) * 8),
    safeNumber(metrics.averageRating) * 11,
    safeNumber(metrics.totalGoals) * 1.5,
    safeNumber(metrics.totalAssists) * 2.4,
    safeNumber(metrics.squadDepth) * 3,
    safeNumber(aiReport?.overallScore),
  ]);

  const depthTrend = buildMetricTrend([
    safeNumber(metrics.squadDepth) * 2.4,
    Math.max(0, 100 - Math.abs(safeNumber(metrics.averageAge, 26) - 26) * 9),
    safeNumber(metrics.totalGoals) * 1.1,
    safeNumber(metrics.totalAssists) * 1.8,
    safeNumber(metrics.incomingTransfers) * 12 + 18,
    safeNumber(metrics.squadDepth) * 3.1,
  ]);

  const balanceTrend = buildMetricTrend(
    transferBalance >= 0
      ? [
          safeNumber(metrics.outgoingTransfers) * 10 + 16,
          safeNumber(metrics.incomingTransfers) * 12 + 18,
          (safeNumber(metrics.incomingTransfers) + transferBalance) * 10 + 24,
          safeNumber(metrics.averageRating) * 10,
          safeNumber(metrics.incomingTransfers) * 13 + 22,
          safeNumber(metrics.totalAssists) * 1.4 + 24,
        ]
      : [
          safeNumber(metrics.incomingTransfers) * 11 + 34,
          safeNumber(metrics.outgoingTransfers) * 13 + 18,
          (safeNumber(metrics.outgoingTransfers) + Math.abs(transferBalance)) * 10 + 24,
          safeNumber(metrics.averageRating) * 8.6,
          safeNumber(metrics.incomingTransfers) * 9 + 18,
          Math.max(12, safeNumber(metrics.totalGoals) * 0.8 + 14),
        ]
  );

  const transferBalanceTone =
    transferBalance > 0
      ? "team-ops-metric-green"
      : transferBalance < 0
      ? "team-ops-metric-red"
      : "team-ops-metric-cyan";

  return (
    <main className="dashboard-page team-ops-page">
      <div className="team-ops-topline">
        <strong>Transfera</strong>
        <span>Takım Profili - Güncel</span>
      </div>

      <section className="team-ops-hero">
        <div className="team-ops-identity">
          <div className="team-ops-badge">
            {!loading && getEntityImage(teamData?.team) ? (
              <img src={getEntityImage(teamData?.team)} alt={teamData?.team?.name || "Takım"} />
            ) : (
              <span>{getInitials(teamData?.team?.name || "Takım")}</span>
            )}
          </div>

          <div className="team-ops-copy">
            <h1>
              {loading
                ? "Takım yükleniyor..."
                : formatEntityText(teamData?.team?.name) || "Takım"}
            </h1>
            <p>Kadro, kulüp bilgileri ve transfer geçmişi tek ekranda.</p>
          </div>
        </div>

        <div className="team-ops-actions">
          <Link to="/dashboard" className="button-secondary team-ops-button">
            Gösterge Paneline Dön
          </Link>
          <button className="button-primary team-ops-button" onClick={handleGoBack}>
            Geri Git
          </button>
        </div>
      </section>

      {error ? <div className="feedback error">{formatEntityText(error)}</div> : null}

      {loading ? (
        <section className="team-ops-shell">
          <p>Takım detayları yükleniyor...</p>
        </section>
      ) : teamData ? (
        <>
          <section className="team-ops-shell">
            <div className="team-ops-section-title">
              <h2>Temel Bilgiler</h2>
            </div>

            <div className="team-ops-info-grid">
              <article className="team-ops-info-card">
                <span>Takım</span>
                <strong>{formatEntityText(teamData.team?.name)}</strong>
                <i />
              </article>
              <article className="team-ops-info-card">
                <span>Ülke</span>
                <strong>{resolvedCountry}</strong>
                <i />
              </article>
              <article className="team-ops-info-card">
                <span>Lig</span>
                <strong>{formatEntityText(resolvedLeague || "Lig bilgisi yok")}</strong>
                <i />
              </article>
              <article className="team-ops-info-card">
                <span>Kuruluş</span>
                <strong>{teamData.team?.founded || "-"}</strong>
                <i />
              </article>
            </div>
          </section>

          <section className="team-ops-shell team-ops-shell-pattern">
            <div className="team-ops-section-title">
              <h2>Yapay Zeka Analizleri</h2>
            </div>

            <div className="team-ops-metric-grid">
              <article className="team-ops-metric-card team-ops-metric-gold">
                <span>Genel Skor</span>
                <strong>{clampPercent(aiReport?.overallScore)}%</strong>
                <small>{formatEntityText(aiReport?.status || "Bilinmiyor")}</small>
                <svg viewBox="0 0 136 72" className="team-ops-chart">
                  <polyline points={overallTrend.points} />
                </svg>
              </article>

              <article className="team-ops-metric-card team-ops-metric-cyan">
                <span>Kadro Derinliği</span>
                <strong>{metrics.squadDepth || 0}</strong>
                <small>Ortalama yaş: {metrics.averageAge || "-"}</small>
                <svg viewBox="0 0 136 72" className="team-ops-chart">
                  <polyline points={depthTrend.points} />
                </svg>
              </article>

              <article className={`team-ops-metric-card ${transferBalanceTone}`}>
                <span>Transfer Dengesi</span>
                <strong>{formatSignedValue(transferBalance)}</strong>
                <small>Ortalama rating: {metrics.averageRating || "-"}</small>
                <svg viewBox="0 0 136 72" className="team-ops-chart">
                  <polyline points={balanceTrend.points} />
                </svg>
              </article>
            </div>

            <div className="team-ops-ai-notes">
              <article className="team-ops-note-card">
                <span>Özet</span>
                <p>
                  {formatEntityText(
                    aiReport?.narrative?.headline ||
                      aiReport?.summary ||
                      "AI raporu oluşturulamadı."
                  )}
                </p>
              </article>

              <article className="team-ops-note-card">
                <span>Tavsiyeler</span>
                <div className="team-ops-note-list">
                  {(aiReport?.narrative?.recommendations || []).map((item, index) => (
                    <p key={`${item}-${index}`}>{formatEntityText(item)}</p>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="team-ops-shell">
            <div className="team-ops-section-title team-ops-section-title-split">
              <h2>Son Transferler</h2>
              {(teamData.transferHistory || []).length > 6 ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setShowAllTransfers((current) => !current)}
                >
                  {showAllTransfers ? "Daha Az Göster" : "Tümünü Gör"}
                </button>
              ) : null}
            </div>

            <div className="team-ops-transfer-list">
              {visibleTransfers.length ? (
                visibleTransfers.map((transfer) => (
                  <article key={transfer.id} className="team-ops-transfer-item">
                    <div className="team-ops-transfer-player">
                      <div className="team-ops-transfer-avatar">
                        {getEntityImage(transfer) ? (
                          <img
                            src={getEntityImage(transfer)}
                            alt={formatEntityText(transfer.playerName || "Oyuncu")}
                          />
                        ) : (
                          getInitials(formatEntityText(transfer.playerName || "Oyuncu"))
                        )}
                      </div>
                      <div className="team-ops-transfer-copy">
                        <h3>{formatEntityText(transfer.playerName || "Oyuncu")}</h3>
                        <p className="team-ops-transfer-route">
                          <span>{formatEntityText(transfer.fromTeam || "Kulüp")}</span>
                          <strong>{"\u2192"}</strong>
                          <span>{formatEntityText(transfer.toTeam || "Kulüp")}</span>
                        </p>
                      </div>
                    </div>
                    <div className="team-ops-transfer-meta">
                      <span className="team-ops-transfer-date">{transfer.date || "-"}</span>
                      <strong className="team-ops-transfer-fee">
                        {formatTransferCurrency(
                          transfer.amount,
                          formatEntityText(transfer.amountCurrency || "EUR")
                        )}
                      </strong>
                    </div>
                  </article>
                ))
              ) : (
                <article className="team-ops-note-card">
                  <span>Transfer kaydı yok</span>
                  <p>Bu takım için listelenecek bir hareket bulunamadı.</p>
                </article>
              )}
            </div>
          </section>

          <section className="team-ops-shell team-ops-shell-pattern">
            <div className="team-ops-section-title">
              <h2>Güncel Kadro</h2>
            </div>

            <div className="team-ops-roster-grid">
              {(teamData.squad || []).map((player) => (
                <article key={player.id} className="team-ops-player-card">
                  <div className="team-ops-player-top">
                    <div className="team-ops-player-avatar">
                      {getEntityImage(player) ? (
                        <img src={getEntityImage(player)} alt={player.name} />
                      ) : (
                        <span>{getInitials(player.name)}</span>
                      )}
                    </div>

                    <div className="team-ops-player-copy">
                      <small>{formatEntityText(player.position || "Oyuncu")}</small>
                      <h3>{formatEntityText(player.name)}</h3>
                      <p>{formatEntityText(player.detailedPosition || "Pozisyon bilgisi yok")}</p>
                    </div>

                    <div className="team-ops-player-tag">
                      <span>{player.statistics?.goals || 0} gol</span>
                    </div>
                  </div>

                  <div className="team-ops-player-meta">
                    <span>{formatEntityText(player.nationality || "Ülke yok")}</span>
                  </div>

                  <button
                    className="button-secondary team-ops-player-button"
                    onClick={() =>
                      navigate(`/players/${player.id}`, {
                        state: {
                          leagueName: resolvedLeague,
                          teamName: teamData.team?.name || null,
                          fromTeamId: teamId,
                          fromTeamLeague: resolvedLeague,
                          returnTo,
                        },
                      })
                    }
                  >
                    Oyuncu Detayı
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="team-ops-community">
            <div className="team-ops-community-form">
              <div className="team-ops-section-title">
                <h2>Topluluk</h2>
              </div>

              <form className="team-ops-comment-box" onSubmit={handleCreateComment}>
                <div className="team-ops-comment-avatar">{getInitials(currentUser?.name || "U")}</div>
                <div className="team-ops-comment-main">
                  <textarea
                    className="input textarea team-ops-textarea"
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Yorumunu yaz..."
                    required
                  />
                  <div className="team-ops-comment-actions">
                    <div className="team-ops-stars">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`team-ops-star ${commentRating >= value ? "team-ops-star-active" : ""}`}
                          onClick={() => setCommentRating(value)}
                        >
                          {"\u2605"}
                        </button>
                      ))}
                    </div>
                    <button className="button-primary" type="submit">
                      Yorumu Gönder
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="team-ops-community-feed">
              <div className="team-ops-section-title">
                <h2>Sayfadaki tüm yorumlar</h2>
              </div>

              <div className="team-ops-review-list">
                {comments.length ? (
                  comments.map((comment) => (
                    <article key={comment._id} className="team-ops-review-item">
                      <div>
                        <h3>
                          {formatEntityText(comment.user?.name)}{" "}
                          {formatEntityText(comment.user?.surname)}
                          {comment.user?._id === currentUser?.id ? ` ${"\u2022"} Sen` : ""}
                        </h3>
                        <p>{formatEntityText(comment.text)}</p>
                      </div>
                      <strong>{comment.rating}/5</strong>
                    </article>
                  ))
                ) : (
                  <article className="team-ops-note-card">
                    <span>Henüz yorum yok</span>
                    <p>İlk yorumu sen ekleyebilirsin.</p>
                  </article>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
