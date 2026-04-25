import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { storage } from "../services/api";
import { logoutUser } from "../services/authService";
import { resolveCommentTargets } from "../services/adminUtils";

async function fetchAllComments() {
  const pageSize = 50;
  const firstResponse = await api.get(`/api/comments?limit=${pageSize}&page=1`);
  const firstBatch = firstResponse.data?.data || [];
  const totalPages = Math.max(
    Number(firstResponse.data?.pagination?.totalPages || 1),
    1
  );

  if (totalPages === 1) {
    return firstBatch;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      api.get(`/api/comments?limit=${pageSize}&page=${index + 2}`)
    )
  );

  return [
    ...firstBatch,
    ...remainingResponses.flatMap((response) => response.data?.data || []),
  ];
}

function formatCommentDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("tr-TR");
}

function formatStars(rating) {
  const safeRating = Math.min(5, Math.max(0, Number(rating) || 0));
  return `${"★".repeat(safeRating)}${"☆".repeat(5 - safeRating)}`;
}

export default function CommentsCommunityPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(storage.getUser());
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadComments() {
      setLoading(true);

      try {
        const allComments = await fetchAllComments();
        const resolvedComments = await resolveCommentTargets(allComments);
        setComments(resolvedComments);
      } catch (error) {
        setFeedback(
          error.response?.data?.message || "Topluluk yorumları yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    loadComments();
  }, []);

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      window.location.replace("/login");
    }
  }

  const visibleComments = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return comments.filter((comment) => {
      if (typeFilter !== "all" && comment.targetType !== typeFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableFields = [
        comment.text,
        comment.targetLabel,
        comment.user?.name,
        comment.user?.surname,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableFields.includes(normalizedQuery);
    });
  }, [comments, search, typeFilter]);

  return (
    <main className="dashboard-page community-page">
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
            <strong>{profile?.name || "User"}</strong>
          </div>
          <button className="dashboard-command-button" onClick={() => navigate("/comments")}>
            Yorumlar
          </button>
          <button className="dashboard-command-button" onClick={() => navigate("/agent")}>
            Agent
          </button>
          <button className="dashboard-command-button" onClick={() => navigate("/favorites")}>
            Favoriler
          </button>
          <button className="dashboard-command-button" onClick={() => navigate("/profile")}>
            Profil
          </button>
          <button className="dashboard-command-button" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          <button className="dashboard-command-button dashboard-command-exit" onClick={handleLogout}>
            Çıkış Yap
          </button>
        </div>
      </header>

      <section className="community-hero studio-panel">
        <div className="studio-section-head">
          <p className="eyebrow eyebrow-muted">Community Comments</p>
          <h2>Yorum topluluğu</h2>
          <p>
            Oyuncu ve takım yorumlarını tek ekranda incele. Filtrelerle yalnızca
            istediğin yorum tipini öne çıkar.
          </p>
        </div>

        <div className="community-filter-row">
          <input
            className="input community-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Yorum, kullanıcı veya hedef ara"
          />

          <div className="community-filter-chips">
            <button
              type="button"
              className={`studio-chip ${typeFilter === "all" ? "studio-chip-active" : ""}`}
              onClick={() => setTypeFilter("all")}
            >
              Tümü
            </button>
            <button
              type="button"
              className={`studio-chip ${typeFilter === "player" ? "studio-chip-active" : ""}`}
              onClick={() => setTypeFilter("player")}
            >
              Oyuncu
            </button>
            <button
              type="button"
              className={`studio-chip ${typeFilter === "team" ? "studio-chip-active" : ""}`}
              onClick={() => setTypeFilter("team")}
            >
              Takım
            </button>
          </div>
        </div>
      </section>

      {feedback ? <div className="feedback error">{feedback}</div> : null}

      <section className="community-comments-panel panel">
        <div className="panel-head">
          <div>
            <span>Yorum akışı</span>
            <h2>{loading ? "Yorumlar yükleniyor..." : `${visibleComments.length} yorum gösteriliyor`}</h2>
          </div>
        </div>

        <div className={`list-stack ${visibleComments.length > 6 ? "community-comments-scroll" : ""}`}>
          {!loading && visibleComments.length ? (
            visibleComments.map((comment) => {
              const author = `${comment.user?.name || "Transfera"} ${comment.user?.surname || "Kullanıcısı"}`.trim();
              const targetTypeLabel = comment.targetType === "team" ? "Takım yorumu" : "Oyuncu yorumu";

              return (
                <article key={comment._id || `${author}-${comment.createdAt}`} className="list-item community-comment-card">
                  <div className="community-comment-main">
                    <div className="community-comment-top">
                      <div>
                        <h3>{author}</h3>
                        <p>
                          {targetTypeLabel} • {comment.targetLabel || "Hedef bilgisi yok"}
                        </p>
                      </div>
                      <strong className="community-comment-rating">{formatStars(comment.rating)}</strong>
                    </div>
                    <p className="community-comment-text">{comment.text}</p>
                  </div>
                  <small className="community-comment-date">{formatCommentDate(comment.createdAt)}</small>
                </article>
              );
            })
          ) : null}

          {!loading && !visibleComments.length ? (
            <div className="stat-box">
              <small>Sonuç yok</small>
              <strong>Bu filtrelerle eşleşen yorum bulunamadı.</strong>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
