import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api, { resolveLeagueMeta, storage } from "../services/api";
import { getEntityImage, getInitials, getLeagueLogo } from "../services/brandAssets";
import { formatEntityText } from "../services/textFormatter";

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

  return `${trimNumber(numeric)}M EUR`;
}

function formatTransferCurrency(amount) {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (Math.abs(numeric) >= 1_000_000) {
    return `${trimNumber(numeric / 1_000_000)}M EUR`;
  }

  if (Math.abs(numeric) >= 1_000) {
    return `${trimNumber(numeric / 1_000)}K EUR`;
  }

  return `${trimNumber(numeric)} EUR`;
}

function normalizeName(value) {
  return formatEntityText(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTransferRoute(transfer) {
  const fromTeam = formatEntityText(transfer.fromTeam || "Bilinmeyen kulüp");
  const toTeam = formatEntityText(transfer.toTeam || "Bilinmeyen kulüp");
  return `${fromTeam} → ${toTeam}`;
}

function resolveTransferFee(transfer, history = []) {
  const directAmount = formatTransferCurrency(transfer.amount);
  if (directAmount) {
    return directAmount;
  }

  const transferDate = transfer.date || "";
  const normalizedTarget = normalizeName(transfer.toTeam);
  const exactMatch = history.find(
    (item) =>
      item.date === transferDate &&
      normalizeName(item.team) === normalizedTarget &&
      Number.isFinite(Number(item.value))
  );

  if (exactMatch) {
    return formatMillionValue(exactMatch.value);
  }

  const nearestMatch = history.find(
    (item) =>
      normalizeName(item.team) === normalizedTarget &&
      Number.isFinite(Number(item.value))
  );

  if (nearestMatch) {
    return formatMillionValue(nearestMatch.value);
  }

  return "Değer bilgisi yok";
}

function formatCurrentMarketValue(marketValue, player) {
  const amount = marketValue?.currentValue?.amount ?? player?.marketValue?.current;
  return formatMillionValue(amount);
}

export default function PlayerDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [marketValue, setMarketValue] = useState(null);
  const [aiValuePrediction, setAiValuePrediction] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leagueMeta, setLeagueMeta] = useState(null);

  const currentUser = storage.getUser();
  const fallbackLeagueName = location.state?.leagueName || null;
  const fallbackTeamName = location.state?.teamName || null;
  const fromTeamId = location.state?.fromTeamId || null;
  const fromTeamLeague = location.state?.fromTeamLeague || fallbackLeagueName || null;
  const returnTo = location.state?.returnTo || null;

  async function loadComments() {
    const commentsResponse = await api.get(`/api/players/${playerId}/comments?limit=20`);
    setComments(commentsResponse.data.data || []);
  }

  useEffect(() => {
    async function loadPlayer() {
      setLoading(true);
      setError("");

      try {
        const teamContextQuery = fromTeamId
          ? `?teamId=${encodeURIComponent(fromTeamId)}&teamName=${encodeURIComponent(
              fallbackTeamName || ""
            )}&leagueName=${encodeURIComponent(fromTeamLeague || "")}`
          : "";

        const [playerResponse, marketResponse, aiValueResponse] = await Promise.all([
          api.get(`/players/${playerId}${teamContextQuery}`),
          api.get(`/players/${playerId}/market-value${teamContextQuery}`),
          api.get(`/ai/player-value/${playerId}`),
        ]);

        setPlayer(playerResponse.data.player);
        setMarketValue(marketResponse.data);
        setAiValuePrediction(aiValueResponse.data);
        await loadComments();
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Oyuncu detayları yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPlayer();
  }, [playerId, fromTeamId, fallbackTeamName, fromTeamLeague]);

  useEffect(() => {
    const leagueName = player?.team?.league || player?.league || fallbackLeagueName;

    if (!leagueName) {
      setLeagueMeta(null);
      return;
    }

    resolveLeagueMeta(leagueName).then(setLeagueMeta).catch(() => setLeagueMeta(null));
  }, [player?.team?.league, player?.league, fallbackLeagueName]);

  async function handleCreateComment(event) {
    event.preventDefault();

    try {
      await api.post(`/api/players/${playerId}/comments`, {
        text: commentText,
        rating: commentRating,
      });
      setCommentText("");
      setCommentRating(5);
      await loadComments();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Yorum eklenemedi. Backend kapalı olabilir."
      );
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (returnTo) {
      navigate(returnTo);
      return;
    }

    if (fromTeamId) {
      navigate(`/teams/${fromTeamId}`, {
        state: {
          leagueName: fromTeamLeague,
          returnTo,
        },
      });
      return;
    }

    navigate("/dashboard", { replace: true });
  }

  const leagueLogo =
    leagueMeta?.imagePath ||
    getLeagueLogo(player?.team?.league || player?.league || fallbackLeagueName);

  const transferHistory = useMemo(
    () =>
      (player?.transfers || []).map((transfer) => ({
        ...transfer,
        displayAmount: resolveTransferFee(transfer, marketValue?.history || []),
      })),
    [marketValue?.history, player?.transfers]
  );

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">OYUNCU DETAYI</span>
          <div className="hero-title-with-mark">
            <div className="hero-mark hero-mark-player">
              {!loading && getEntityImage(player) ? (
                <img src={getEntityImage(player)} alt={player?.name || "Oyuncu"} />
              ) : leagueLogo ? (
                <img
                  src={leagueLogo}
                  alt={player?.team?.league || player?.league || fallbackLeagueName || "Lig"}
                />
              ) : (
                <span>{getInitials(player?.name || "Oyuncu")}</span>
              )}
            </div>
            <h1>
              {loading
                ? "Oyuncu yükleniyor..."
                : formatEntityText(player?.name) || "Oyuncu bulunamadı"}
            </h1>
          </div>
          <p>Yaş, pozisyon, takım, istatistik, piyasa değeri ve transfer geçmişi tek ekranda.</p>
        </div>

        <div className="hero-actions">
          <Link to="/dashboard" className="button-secondary">
            Dashboard&apos;a Dön
          </Link>
          <button className="button-primary" onClick={handleBack}>
            Geri Git
          </button>
        </div>
      </section>

      {error ? <div className="feedback error">{error}</div> : null}

      {loading ? (
        <div className="panel" style={{ marginTop: 24 }}>
          Veriler yükleniyor...
        </div>
      ) : player ? (
        <>
          <section className="player-spotlight-grid">
            <article className="panel panel-highlight">
              <div className="panel-head">
                <div>
                  <span>Oyuncu Kartı</span>
                  <h2>Sahadaki kimliği</h2>
                </div>
              </div>

              <div className="player-header-card">
                <div className="entity-avatar entity-avatar-player entity-avatar-xl">
                  {getEntityImage(player) ? (
                    <img src={getEntityImage(player)} alt={player.name} />
                  ) : (
                    <span>{getInitials(player.name)}</span>
                  )}
                </div>
                <div className="player-header-copy">
                  <div className="player-role-pill">
                    {formatEntityText(
                      player.detailedPosition || player.position || "Pozisyon bilgisi yok"
                    )}
                  </div>
                </div>
              </div>

              <div className="player-meta-grid">
                <div className="stat-box">
                  <small>Takım:</small>
                  <strong>
                    {formatEntityText(
                      player.team?.name || fallbackTeamName || "Kulüp bilgisi yok"
                    )}
                  </strong>
                </div>
                <div className="stat-box">
                  <small>Lig:</small>
                  <strong>
                    {formatEntityText(
                      player.team?.league || player.league || fallbackLeagueName || "Lig bilgisi yok"
                    )}
                  </strong>
                </div>
                <div className="stat-box">
                  <small>Uyruk:</small>
                  <strong>{formatEntityText(player.nationality || "Bilinmiyor")}</strong>
                </div>
                <div className="stat-box">
                  <small>Yaş:</small>
                  <strong>{player.age || "-"}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <span>İstatistikler</span>
                  <h2>Performans özeti</h2>
                </div>
              </div>

              <div className="player-performance-grid">
                <div className="stat-box">
                  <small>Maç</small>
                  <strong>{player.statistics?.appearances || 0}</strong>
                </div>
                <div className="stat-box">
                  <small>Dakika</small>
                  <strong>{player.statistics?.minutes || 0}</strong>
                </div>
                <div className="stat-box">
                  <small>Rating</small>
                  <strong>{player.statistics?.rating || "-"}</strong>
                </div>
                <div className="stat-box">
                  <small>Gol</small>
                  <strong>{player.statistics?.goals || 0}</strong>
                </div>
                <div className="stat-box">
                  <small>Asist</small>
                  <strong>{player.statistics?.assists || 0}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="dashboard-layout">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <span>Profil</span>
                  <h2>Temel oyuncu bilgileri</h2>
                </div>
              </div>

              <div className="profile-list">
                <div>
                  <dt>Ad Soyad</dt>
                  <dd>{formatEntityText(player.name)}</dd>
                </div>
                <div>
                  <dt>Takım</dt>
                  <dd>{formatEntityText(player.team?.name || fallbackTeamName || "Kulüp bilgisi yok")}</dd>
                </div>
                <div>
                  <dt>Lig</dt>
                  <dd>{formatEntityText(player.team?.league || player.league || fallbackLeagueName || "Lig bilgisi yok")}</dd>
                </div>
                <div>
                  <dt>Pozisyon</dt>
                  <dd>{formatEntityText(player.detailedPosition || player.position || "Bilinmiyor")}</dd>
                </div>
                <div>
                  <dt>Uyruk</dt>
                  <dd>{formatEntityText(player.nationality || "Bilinmiyor")}</dd>
                </div>
                <div>
                  <dt>Doğum Tarihi</dt>
                  <dd>{player.dateOfBirth || "Bilinmiyor"}</dd>
                </div>
                <div>
                  <dt>Ad</dt>
                  <dd>{player.firstname || "-"}</dd>
                </div>
                <div>
                  <dt>Soyad</dt>
                  <dd>{player.lastname || "-"}</dd>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <span>Piyasa Değeri</span>
                  <h2>Değer panosu</h2>
                </div>
              </div>

              <div className="value-hero-card">
                <small>Güncel tahmin</small>
                <strong>{formatCurrentMarketValue(marketValue, player)}</strong>
              </div>

              <div className="list-stack">
                {(marketValue?.history || []).slice(0, 4).map((item, index) => (
                  <article key={`${item.date}-${index}`} className="list-item compact">
                    <div>
                      <h3>{formatEntityText(item.team || "Kulüp bilgisi yok")}</h3>
                      <p>{item.date}</p>
                    </div>
                    <strong>{formatMillionValue(item.value)}</strong>
                  </article>
                ))}
                {!marketValue?.history?.length ? (
                  <div className="stat-box">
                    <small>Kayıt bulunamadı</small>
                    <strong>{formatCurrentMarketValue(marketValue, player)}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="panel panel-highlight" style={{ marginTop: 24 }}>
            <div className="panel-head">
              <div>
                <span>AI Oyuncu Değer Tahmini</span>
                <h2>Yapay zeka destekli değer projeksiyonu</h2>
              </div>
            </div>

            <div className="ai-factor-grid" style={{ marginTop: 18 }}>
              <div className="stat-box">
                <small>12 aylık tahmin</small>
                <strong>{formatMillionValue(aiValuePrediction?.projectedValue?.amount)}</strong>
              </div>
              <div className="stat-box">
                <small>Değer bandı</small>
                <strong>
                  {formatMillionValue(aiValuePrediction?.valuationBand?.low)} -{" "}
                  {formatMillionValue(aiValuePrediction?.valuationBand?.high)}
                </strong>
              </div>
              <div className="stat-box">
                <small>Trend</small>
                <strong>{formatEntityText(aiValuePrediction?.outlook || "Bilinmiyor")}</strong>
              </div>
              <div className="stat-box">
                <small>Güven seviyesi</small>
                <strong>{formatEntityText(aiValuePrediction?.confidence || "Bilinmiyor")}</strong>
              </div>
            </div>

            <div className="ai-text-panel" style={{ marginTop: 18 }}>
              <p className="panel-subcopy">
                {formatEntityText(
                  aiValuePrediction?.aiReport?.headline ||
                    aiValuePrediction?.summary ||
                    "AI tahmini hazırlanamadı."
                )}
              </p>
              <div className="ai-bullet-list">
                {(aiValuePrediction?.aiReport?.reasons || []).map((reason, index) => (
                  <p key={`${reason}-${index}`}>{formatEntityText(reason)}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="dashboard-layout">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <span>Yorum Ekle</span>
                  <h2>Bu oyuncu hakkında yorum yap</h2>
                </div>
              </div>

              <form className="comment-form" onSubmit={handleCreateComment}>
                <textarea
                  className="input textarea"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Oyuncu hakkında yorum yaz"
                  required
                />
                <div className="comment-actions">
                  <div className="rating-picker">
                    {[5, 4, 3, 2, 1].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`chip rating-chip ${
                          commentRating === value ? "chip-active" : ""
                        }`}
                        onClick={() => setCommentRating(value)}
                      >
                        {value} puan
                      </button>
                    ))}
                  </div>
                  <button className="button-primary" type="submit">
                    Yorumu Gönder
                  </button>
                </div>
              </form>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <span>Yorumlar</span>
                  <h2>Sayfadaki tüm yorumlar</h2>
                </div>
              </div>

              <div
                className={`list-stack ${
                  comments.length > 2 ? "player-comments-scroll" : ""
                }`}
              >
                {comments.length ? (
                  comments.map((comment) => (
                    <article key={comment._id} className="list-item">
                      <div>
                        <h3>
                          {formatEntityText(comment.user?.name)} {formatEntityText(comment.user?.surname)}
                          {comment.user?._id === currentUser?.id ? " • Sen" : ""}
                        </h3>
                        <p>{comment.text}</p>
                      </div>
                      <strong>{comment.rating}/5</strong>
                    </article>
                  ))
                ) : (
                  <div className="stat-box">
                    <small>Henüz yorum yok</small>
                    <strong>İlk yorumu sen ekleyebilirsin.</strong>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel" style={{ marginTop: 24 }}>
            <div className="panel-head">
              <div>
                <span>Transfer Geçmişi</span>
                <h2>Kariyer hareketleri</h2>
              </div>
            </div>

            <div className="list-stack">
              {transferHistory.length ? (
                transferHistory.map((transfer) => (
                  <article key={`${transfer.id}-${transfer.date}`} className="list-item">
                    <div>
                      <h3>{formatTransferRoute(transfer)}</h3>
                      <p>
                        {transfer.date} • {formatEntityText(transfer.type || "Transfer")}
                      </p>
                    </div>
                    <strong>{transfer.displayAmount}</strong>
                  </article>
                ))
              ) : (
                <div className="stat-box">
                  <small>Transfer kaydı yok</small>
                  <strong>Bu oyuncu için listelenecek bir hareket bulunamadı.</strong>
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
