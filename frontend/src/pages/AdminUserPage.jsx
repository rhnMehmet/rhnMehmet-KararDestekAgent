import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { resolveTeamById, storage } from "../services/api";
import {
  formatAdminDate,
  getCommentTargetLabel,
  resolveCommentTargets,
} from "../services/adminUtils";

const initialProfileForm = {
  name: "",
  surname: "",
  email: "",
};

const initialPasswordForm = {
  newPassword: "",
};

const initialNotificationForm = {
  transferUpdates: true,
  matchAlerts: true,
  newsletter: false,
};

const SEARCHABLE_LEAGUES = [
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
];

function getInitials(name, surname) {
  return `${name?.[0] || ""}${surname?.[0] || ""}`.toUpperCase() || "U";
}

function syncStoredUserIfNeeded(updatedUser, notifications = null) {
  const currentUser = storage.getUser();
  const updatedId = String(updatedUser?.id || updatedUser?._id || "");

  if (!currentUser?.id || currentUser.id !== updatedId) {
    return;
  }

  storage.setUser({
    ...currentUser,
    ...updatedUser,
    id: updatedUser?.id || updatedUser?._id || currentUser.id,
    notificationPreferences:
      notifications || updatedUser?.notificationPreferences || currentUser.notificationPreferences,
  });
}

async function resolveFavoritePlayers(playerIds = []) {
  const results = await Promise.all(
    playerIds.map(async (playerId) => {
      try {
        const { data } = await api.get(`/players/${playerId}`);
        return data.player || null;
      } catch {
        return {
          id: Number(playerId),
          name: `Oyuncu #${playerId}`,
          team: null,
        };
      }
    })
  );

  return results.filter(Boolean);
}

async function resolveFavoriteTeams(teamIds = []) {
  const results = await Promise.all(
    teamIds.map(async (teamId) => {
      try {
        return await resolveTeamById(teamId);
      } catch {
        return {
          id: Number(teamId),
          name: `Takım #${teamId}`,
          league: null,
        };
      }
    })
  );

  return results.filter(Boolean);
}

async function loadAllLeaguePlayers() {
  const responses = await Promise.all(
    SEARCHABLE_LEAGUES.map((league) =>
      api.get(`/players?limit=1000&league=${encodeURIComponent(league)}`)
    )
  );

  const uniquePlayers = new Map();

  responses.forEach((response) => {
    (response.data?.data || []).forEach((player) => {
      if (!uniquePlayers.has(Number(player.id))) {
        uniquePlayers.set(Number(player.id), player);
      }
    });
  });

  return Array.from(uniquePlayers.values());
}

async function loadAllLeagueTeams() {
  const responses = await Promise.all(
    SEARCHABLE_LEAGUES.map((league) =>
      api.get(`/teams?limit=100&league=${encodeURIComponent(league)}`).then((response) => ({
        league,
        data: response.data,
      }))
    )
  );

  const uniqueTeams = new Map();

  responses.forEach((response) => {
    (response.data?.data || []).forEach((team) => {
      const normalizedTeam = {
        ...team,
        league:
          team.league ||
          team.currentSeason?.league?.name ||
          team.activeSeasons?.find((season) => season?.league?.name)?.league?.name ||
          response.league,
      };

      if (!uniqueTeams.has(Number(team.id))) {
        uniqueTeams.set(Number(team.id), normalizedTeam);
      }
    });
  });

  return Array.from(uniqueTeams.values());
}

export default function AdminUserPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [comments, setComments] = useState([]);
  const [favoritePlayers, setFavoritePlayers] = useState([]);
  const [favoriteTeams, setFavoriteTeams] = useState([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [playerSearchResults, setPlayerSearchResults] = useState([]);
  const [teamSearchResults, setTeamSearchResults] = useState([]);
  const [searchablePlayers, setSearchablePlayers] = useState([]);
  const [searchableTeams, setSearchableTeams] = useState([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [searchingTeams, setSearchingTeams] = useState(false);
  const [favoriteActionKey, setFavoriteActionKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentEditForm, setCommentEditForm] = useState({
    text: "",
    rating: 5,
  });
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [notificationForm, setNotificationForm] = useState(initialNotificationForm);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    const currentUser = storage.getUser();

    if (!currentUser?.id) {
      navigate("/login", { replace: true });
      return;
    }

    if (currentUser.role !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    async function loadUserPage() {
      setLoading(true);

      try {
        const [userResponse, commentsResponse] = await Promise.all([
          api.get(`/users/${userId}`),
          api.get(`/users/${userId}/comments`),
        ]);

        const nextProfile = userResponse.data.user || null;
        const [resolvedComments, resolvedPlayers, resolvedTeams] = await Promise.all([
          resolveCommentTargets(commentsResponse.data.data || []),
          resolveFavoritePlayers(nextProfile?.favorites?.players || []),
          resolveFavoriteTeams(nextProfile?.favorites?.teams || []),
        ]);

        setProfile(nextProfile);
        setComments(resolvedComments);
        setFavoritePlayers(resolvedPlayers);
        setFavoriteTeams(resolvedTeams);
        setProfileForm({
          name: nextProfile?.name || "",
          surname: nextProfile?.surname || "",
          email: nextProfile?.email || "",
        });
        setNotificationForm({
          transferUpdates: nextProfile?.notificationPreferences?.transferUpdates ?? true,
          matchAlerts: nextProfile?.notificationPreferences?.matchAlerts ?? true,
          newsletter: nextProfile?.notificationPreferences?.newsletter ?? false,
        });
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Kullanıcı detayları yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    loadUserPage();
  }, [userId]);

  useEffect(() => {
    async function loadSearchPools() {
      try {
        const [players, teams] = await Promise.all([
          loadAllLeaguePlayers(),
          loadAllLeagueTeams(),
        ]);

        setSearchablePlayers(players);
        setSearchableTeams(teams);
      } catch {
        setSearchablePlayers([]);
        setSearchableTeams([]);
      }
    }

    loadSearchPools();
  }, []);

  useEffect(() => {
    async function searchPlayers() {
      const query = playerSearch.trim();
      if (query.length < 2) {
        setPlayerSearchResults([]);
        return;
      }

      setSearchingPlayers(true);

      try {
        const normalizedQuery = query.toLowerCase();
        const results = searchablePlayers
          .filter((player) => {
            const playerName = String(player.name || "").toLowerCase();
            const teamName = String(player.team?.name || player.teamName || "").toLowerCase();

            return (
              playerName.includes(normalizedQuery) || teamName.includes(normalizedQuery)
            );
          })
          .slice(0, 40);

        setPlayerSearchResults(results);
      } catch {
        setPlayerSearchResults([]);
      } finally {
        setSearchingPlayers(false);
      }
    }

    searchPlayers();
  }, [playerSearch, searchablePlayers]);

  useEffect(() => {
    async function searchTeams() {
      const query = teamSearch.trim();
      if (query.length < 2) {
        setTeamSearchResults([]);
        return;
      }

      setSearchingTeams(true);

      try {
        const normalizedQuery = query.toLowerCase();
        const results = searchableTeams
          .filter((team) => {
            const teamName = String(team.name || "").toLowerCase();
            const leagueName = String(team.league || team.country || "").toLowerCase();

            return (
              teamName.includes(normalizedQuery) || leagueName.includes(normalizedQuery)
            );
          })
          .slice(0, 40);

        setTeamSearchResults(results);
      } catch {
        setTeamSearchResults([]);
      } finally {
        setSearchingTeams(false);
      }
    }

    searchTeams();
  }, [teamSearch, searchableTeams]);

  const stats = useMemo(
    () => ({
      commentCount: comments.length,
      favoritePlayers: favoritePlayers.length,
      favoriteTeams: favoriteTeams.length,
    }),
    [comments.length, favoritePlayers.length, favoriteTeams.length]
  );

  function resetMessages() {
    setFeedback("");
    setError("");
  }

  function startCommentEdit(comment) {
    setEditingCommentId(comment._id);
    setCommentEditForm({
      text: comment.text || "",
      rating: comment.rating || 5,
    });
    resetMessages();
  }

  function cancelCommentEdit() {
    setEditingCommentId(null);
    setCommentEditForm({
      text: "",
      rating: 5,
    });
  }

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/admin", { replace: true });
  }

  async function handleProfileUpdate(event) {
    event.preventDefault();
    setSavingProfile(true);
    resetMessages();

    try {
      const { data } = await api.put(`/users/${userId}`, profileForm);
      setProfile((current) => ({
        ...current,
        ...data.user,
      }));
      syncStoredUserIfNeeded(data.user);
      setFeedback("Kullanıcı kimlik bilgileri güncellendi.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Kullanıcı bilgileri güncellenemedi."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    setSavingPassword(true);
    resetMessages();

    try {
      await api.put(`/users/${userId}/password`, {
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(initialPasswordForm);
      setFeedback("Kullanıcı şifresi güncellendi.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Kullanıcı şifresi güncellenemedi."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleNotificationUpdate(event) {
    event.preventDefault();
    setSavingNotifications(true);
    resetMessages();

    try {
      const { data } = await api.put(`/users/${userId}/notifications`, notificationForm);
      const nextProfile = {
        ...profile,
        notificationPreferences: data.notificationPreferences,
      };

      setProfile(nextProfile);
      setNotificationForm(data.notificationPreferences);
      syncStoredUserIfNeeded(nextProfile, data.notificationPreferences);
      setFeedback("Bildirim tercihleri güncellendi.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Bildirim tercihleri güncellenemedi."
      );
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleCommentUpdate(commentId) {
    try {
      const payload = {
        text: String(commentEditForm.text || "").trim(),
        rating: Number(commentEditForm.rating),
      };

      if (!payload.text) {
        setError("Yorum metni boş olamaz.");
        return;
      }

      const { data } = await api.put(`/api/comments/${commentId}`, payload);
      setComments((current) =>
        current.map((comment) =>
          comment._id === commentId
            ? {
                ...comment,
                text: data.comment?.text ?? payload.text,
                rating: data.comment?.rating ?? payload.rating,
              }
            : comment
        )
      );
      cancelCommentEdit();
      setFeedback("Yorum güncellendi.");
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Yorum güncellenemedi."
      );
    }
  }

  async function handleCommentDelete(commentId) {
    try {
      await api.delete(`/api/comments/${commentId}`);
      setComments((current) => current.filter((comment) => comment._id !== commentId));
      setFeedback("Yorum silindi.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Yorum silinemedi.");
    }
  }

  async function handleRemoveFavoritePlayer(playerId) {
    setFavoriteActionKey(`player-remove-${playerId}`);
    resetMessages();

    try {
      await api.delete(`/users/${userId}/favorites/players/${playerId}`);
      setFavoritePlayers((current) =>
        current.filter((player) => Number(player.id) !== Number(playerId))
      );
      setProfile((current) => ({
        ...current,
        favorites: {
          ...current.favorites,
          players: (current.favorites?.players || []).filter(
            (id) => Number(id) !== Number(playerId)
          ),
        },
      }));
      setFeedback("Favori oyuncu silindi.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Favori oyuncu silinemedi."
      );
    } finally {
      setFavoriteActionKey("");
    }
  }

  async function handleRemoveFavoriteTeam(teamId) {
    setFavoriteActionKey(`team-remove-${teamId}`);
    resetMessages();

    try {
      await api.delete(`/users/${userId}/favorites/teams/${teamId}`);
      setFavoriteTeams((current) =>
        current.filter((team) => Number(team.id) !== Number(teamId))
      );
      setProfile((current) => ({
        ...current,
        favorites: {
          ...current.favorites,
          teams: (current.favorites?.teams || []).filter(
            (id) => Number(id) !== Number(teamId)
          ),
        },
      }));
      setFeedback("Favori takım silindi.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Favori takım silinemedi."
      );
    } finally {
      setFavoriteActionKey("");
    }
  }

  async function handleAddFavoritePlayer(player) {
    setFavoriteActionKey(`player-add-${player.id}`);
    resetMessages();

    try {
      await api.post(`/users/${userId}/favorites/players`, { playerId: player.id });
      setFavoritePlayers((current) =>
        current.some((item) => Number(item.id) === Number(player.id))
          ? current
          : [...current, player]
      );
      setProfile((current) => ({
        ...current,
        favorites: {
          ...current.favorites,
          players: current.favorites?.players?.includes(Number(player.id))
            ? current.favorites.players
            : [...(current.favorites?.players || []), Number(player.id)],
        },
      }));
      setPlayerSearch("");
      setPlayerSearchResults([]);
      setFeedback("Favori oyuncu eklendi.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Favori oyuncu eklenemedi."
      );
    } finally {
      setFavoriteActionKey("");
    }
  }

  async function handleAddFavoriteTeam(team) {
    setFavoriteActionKey(`team-add-${team.id}`);
    resetMessages();

    try {
      const normalizedTeam = {
        ...team,
        league:
          team.league ||
          team.currentSeason?.league?.name ||
          team.activeSeasons?.find((season) => season?.league?.name)?.league?.name ||
          team.country ||
          null,
      };

      await api.post(`/users/${userId}/favorites/teams`, { teamId: team.id });
      setFavoriteTeams((current) =>
        current.some((item) => Number(item.id) === Number(team.id))
          ? current
          : [...current, normalizedTeam]
      );
      setProfile((current) => ({
        ...current,
        favorites: {
          ...current.favorites,
          teams: current.favorites?.teams?.includes(Number(team.id))
            ? current.favorites.teams
            : [...(current.favorites?.teams || []), Number(team.id)],
        },
      }));
      setTeamSearch("");
      setTeamSearchResults([]);
      setFeedback("Favori takım eklendi.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Favori takım eklenemedi."
      );
    } finally {
      setFavoriteActionKey("");
    }
  }

  async function handleDeleteUser() {
    const confirmed = window.confirm(
      "Bu kullanıcı kalıcı olarak silinsin mi?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingUser(true);
    resetMessages();

    try {
      await api.delete(`/users/${userId}`);
      navigate("/admin", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Kullanıcı silinemedi."
      );
    } finally {
      setDeletingUser(false);
    }
  }

  const visiblePlayerSearchResults = playerSearchResults.filter(
    (player) =>
      !favoritePlayers.some((favorite) => Number(favorite.id) === Number(player.id))
  );

  const visibleTeamSearchResults = teamSearchResults.filter(
    (team) =>
      !favoriteTeams.some((favorite) => Number(favorite.id) === Number(team.id))
  );

  return (
    <main className="dashboard-page admin-page-shell">
      <section className="admin-user-hero admin-user-hero-upgraded">
        <div className="admin-user-identity-card">
          <div className="admin-user-identity-top">
            <div className="admin-user-avatar">
              {getInitials(profile?.name, profile?.surname)}
            </div>
            <div className="admin-user-identity-copy">
              <span className="eyebrow eyebrow-brand">KULLANICI YÖNETİMİ</span>
              <h1>
                {profile?.name || "Kullanıcı"} {profile?.surname || ""}
              </h1>
              <p>{profile?.email || "E-posta bilgisi yok"}</p>
            </div>
          </div>

          <div className="admin-user-metric-strip">
            <article className="admin-summary-card">
              <small>Rol</small>
              <strong>{profile?.role || "-"}</strong>
            </article>
            <article className="admin-summary-card">
              <small>Yorum</small>
              <strong>{stats.commentCount}</strong>
            </article>
            <article className="admin-summary-card">
              <small>Kayıt</small>
              <strong>{formatAdminDate(profile?.createdAt)}</strong>
            </article>
            <article className="admin-summary-card">
              <small>Favori toplam</small>
              <strong>{stats.favoritePlayers + stats.favoriteTeams}</strong>
            </article>
          </div>
        </div>

        <aside className="admin-user-sidecard">
          <div className="admin-hero-actions admin-hero-actions-vertical">
            <button className="button-secondary wide" onClick={handleGoBack}>
              Geri Git
            </button>
            <button
              className="button-primary wide"
              onClick={handleDeleteUser}
              disabled={deletingUser}
            >
              {deletingUser ? "Siliniyor..." : "Kullanıcıyı Sil"}
            </button>
          </div>

          <div className="admin-sidecard-note">
            <small>Hızlı not</small>
            <strong>Bu ekranda yalnızca kullanıcıyı yönetiyorsun.</strong>
            <p>
              Kimlik, şifre, bildirim, yorum ve favori ayarları aynı sayfada
              toplandı.
            </p>
          </div>
        </aside>
      </section>

      {feedback ? <div className="feedback info">{feedback}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      {loading ? (
        <div className="panel">
          <strong>Kullanıcı bilgileri yükleniyor...</strong>
        </div>
      ) : (
        <section className="dashboard-layout admin-user-workspace">
          <div className="admin-user-editor-column">
            <article className="panel admin-editor-card admin-editor-card-accent">
              <div className="panel-head">
                <div>
                  <span>Kimlik düzenleme</span>
                  <h2>Ad, soyad ve e-posta</h2>
                </div>
              </div>

              <form className="auth-form" onSubmit={handleProfileUpdate}>
                <div className="auth-grid">
                  <input
                    className="input"
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ad"
                    required
                  />
                  <input
                    className="input"
                    value={profileForm.surname}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        surname: event.target.value,
                      }))
                    }
                    placeholder="Soyad"
                    required
                  />
                </div>

                <input
                  className="input"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="E-posta"
                  required
                />

                <div className="admin-form-footer">
                  <div className="admin-inline-stats">
                    <span>Favori oyuncu: {stats.favoritePlayers}</span>
                    <span>Favori takım: {stats.favoriteTeams}</span>
                  </div>
                  <button className="button-primary" type="submit" disabled={savingProfile}>
                    {savingProfile ? "Kaydediliyor..." : "Bilgileri Kaydet"}
                  </button>
                </div>
              </form>
            </article>

            <div className="admin-edit-subgrid">
              <article className="panel admin-editor-card">
                <div className="panel-head">
                  <div>
                    <span>Şifre işlemi</span>
                    <h2>Kullanıcı şifresini yenile</h2>
                  </div>
                </div>

                <form className="auth-form" onSubmit={handlePasswordUpdate}>
                  <input
                    className="input"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        newPassword: event.target.value,
                      })
                    }
                    placeholder="Yeni şifre"
                    required
                  />
                  <button className="button-primary wide" type="submit" disabled={savingPassword}>
                    {savingPassword ? "Güncelleniyor..." : "Şifreyi Değiştir"}
                  </button>
                </form>
              </article>

              <article className="panel admin-editor-card">
                <div className="panel-head">
                  <div>
                    <span>Durum kartı</span>
                    <h2>Hesap özeti</h2>
                  </div>
                </div>

                <div className="admin-profile-highlight-list">
                  <div>
                    <small>Rol</small>
                    <strong>{profile?.role || "-"}</strong>
                  </div>
                  <div>
                    <small>Oluşturulma</small>
                    <strong>{formatAdminDate(profile?.createdAt)}</strong>
                  </div>
                  <div>
                    <small>Güncellenme</small>
                    <strong>{formatAdminDate(profile?.updatedAt)}</strong>
                  </div>
                </div>
              </article>
            </div>

            <article className="panel admin-editor-card">
              <div className="panel-head">
                <div>
                  <span>Bildirim kontrolü</span>
                  <h2>Kullanıcı tercihleri</h2>
                </div>
              </div>

              <form className="auth-form" onSubmit={handleNotificationUpdate}>
                <label className="admin-toggle-card">
                  <div>
                    <strong>Transfer bildirimleri</strong>
                    <p>Transfer hareketleri için bildirim alır.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationForm.transferUpdates}
                    onChange={(event) =>
                      setNotificationForm((current) => ({
                        ...current,
                        transferUpdates: event.target.checked,
                      }))
                    }
                  />
                </label>

                <label className="admin-toggle-card">
                  <div>
                    <strong>Maç alarmları</strong>
                    <p>Maç ve takım takibi odaklı bildirimler alır.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationForm.matchAlerts}
                    onChange={(event) =>
                      setNotificationForm((current) => ({
                        ...current,
                        matchAlerts: event.target.checked,
                      }))
                    }
                  />
                </label>

                <label className="admin-toggle-card">
                  <div>
                    <strong>Bülten</strong>
                    <p>Haftalık özet ve duyuruları alır.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationForm.newsletter}
                    onChange={(event) =>
                      setNotificationForm((current) => ({
                        ...current,
                        newsletter: event.target.checked,
                      }))
                    }
                  />
                </label>

                <button
                  className="button-primary"
                  type="submit"
                  disabled={savingNotifications}
                >
                  {savingNotifications ? "Kaydediliyor..." : "Bildirimleri Kaydet"}
                </button>
              </form>
            </article>
          </div>

          <div className="admin-user-side-column">
            <aside className="panel admin-comments-panel">
              <div className="panel-head">
                <div>
                  <span>Yorum yönetimi</span>
                  <h2>Bu kullanıcının tüm yorumları</h2>
                </div>
              </div>

              <div
                className={`list-stack admin-comments-list ${
                  comments.length > 4 ? "profile-comments-scroll" : ""
                }`}
              >
                {comments.length ? (
                  comments.map((comment) => (
                    <article key={comment._id} className="list-item admin-comment-card">
                      <div>
                        <h3>{getCommentTargetLabel(comment)}</h3>
                        {editingCommentId === comment._id ? (
                          <div className="comment-edit-stack">
                            <textarea
                              className="input textarea comment-edit-textarea"
                              value={commentEditForm.text}
                              onChange={(event) =>
                                setCommentEditForm((current) => ({
                                  ...current,
                                  text: event.target.value,
                                }))
                              }
                              placeholder="Yorumu düzenle"
                            />
                            <select
                              className="input comment-edit-rating"
                              value={commentEditForm.rating}
                              onChange={(event) =>
                                setCommentEditForm((current) => ({
                                  ...current,
                                  rating: Number(event.target.value),
                                }))
                              }
                            >
                              {[5, 4, 3, 2, 1].map((rating) => (
                                <option key={rating} value={rating}>
                                  {rating}/5
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <>
                            <p>{comment.text}</p>
                            <p className="admin-comment-meta">
                              {formatAdminDate(comment.createdAt)}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="hero-actions comment-card-actions">
                        <strong>
                          {editingCommentId === comment._id
                            ? `${commentEditForm.rating}/5`
                            : `${comment.rating}/5`}
                        </strong>
                        {editingCommentId === comment._id ? (
                          <>
                            <button
                              className="button-secondary"
                              onClick={() => handleCommentUpdate(comment._id)}
                            >
                              Kaydet
                            </button>
                            <button
                              className="button-secondary"
                              onClick={cancelCommentEdit}
                            >
                              İptal
                            </button>
                          </>
                        ) : (
                          <button
                            className="button-secondary"
                            onClick={() => startCommentEdit(comment)}
                          >
                            Güncelle
                          </button>
                        )}
                        <button
                          className="button-secondary"
                          onClick={() => handleCommentDelete(comment._id)}
                        >
                          Sil
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="stat-box">
                    <small>Yorum yok</small>
                    <strong>Bu kullanıcının henüz yorumu bulunmuyor.</strong>
                  </div>
                )}
              </div>
            </aside>

            <article className="panel admin-editor-card admin-favorites-panel">
              <div className="panel-head">
                <div>
                  <span>Favori yönetimi</span>
                  <h2>Favori takımlar ve oyuncular</h2>
                </div>
              </div>

              <div className="admin-favorites-grid">
                <section className="admin-favorite-group">
                  <div className="admin-favorite-group-head">
                    <h3>Favori oyuncular</h3>
                    <span>{favoritePlayers.length} kayıt</span>
                  </div>

                  <div className="admin-favorite-list">
                    {favoritePlayers.length ? (
                      favoritePlayers.map((player) => (
                        <article key={player.id} className="admin-favorite-item">
                          <div>
                            <strong>{player.name}</strong>
                            <p>{player.team?.name || "Takım bilgisi yok"}</p>
                          </div>
                          <button
                            className="button-secondary"
                            onClick={() => handleRemoveFavoritePlayer(player.id)}
                            disabled={favoriteActionKey === `player-remove-${player.id}`}
                          >
                            Sil
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="stat-box">
                        <small>Favori yok</small>
                        <strong>Bu kullanıcı henüz favori oyuncu seçmemiş.</strong>
                      </div>
                    )}
                  </div>

                  <div className="admin-search-panel">
                    <input
                      className="input"
                      value={playerSearch}
                      onChange={(event) => setPlayerSearch(event.target.value)}
                      placeholder="Oyuncu ara ve favoriye ekle"
                    />
                    <div className="admin-search-results">
                      {searchingPlayers ? <p>Oyuncular aranıyor...</p> : null}
                      {!searchingPlayers && visiblePlayerSearchResults.length
                        ? visiblePlayerSearchResults.map((player) => (
                            <div key={player.id} className="admin-search-result">
                              <div>
                                <strong>{player.name}</strong>
                                <p>{player.team?.name || "Takım bilgisi yok"}</p>
                              </div>
                              <button
                                className="button-primary"
                                onClick={() => handleAddFavoritePlayer(player)}
                                disabled={favoriteActionKey === `player-add-${player.id}`}
                              >
                                Ekle
                              </button>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>
                </section>

                <section className="admin-favorite-group">
                  <div className="admin-favorite-group-head">
                    <h3>Favori takımlar</h3>
                    <span>{favoriteTeams.length} kayıt</span>
                  </div>

                  <div className="admin-favorite-list">
                    {favoriteTeams.length ? (
                      favoriteTeams.map((team) => (
                        <article key={team.id} className="admin-favorite-item">
                          <div>
                            <strong>{team.name}</strong>
                            <p>{team.league || "Lig bilgisi yok"}</p>
                          </div>
                          <button
                            className="button-secondary"
                            onClick={() => handleRemoveFavoriteTeam(team.id)}
                            disabled={favoriteActionKey === `team-remove-${team.id}`}
                          >
                            Sil
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="stat-box">
                        <small>Favori yok</small>
                        <strong>Bu kullanıcı henüz favori takım seçmemiş.</strong>
                      </div>
                    )}
                  </div>

                  <div className="admin-search-panel">
                    <input
                      className="input"
                      value={teamSearch}
                      onChange={(event) => setTeamSearch(event.target.value)}
                      placeholder="Takım ara ve favoriye ekle"
                    />
                    <div className="admin-search-results">
                      {searchingTeams ? <p>Takımlar aranıyor...</p> : null}
                      {!searchingTeams && visibleTeamSearchResults.length
                        ? visibleTeamSearchResults.map((team) => (
                            <div key={team.id} className="admin-search-result">
                              <div>
                                <strong>{team.name}</strong>
                                <p>{team.league || team.country || "Lig bilgisi yok"}</p>
                              </div>
                              <button
                                className="button-primary"
                                onClick={() => handleAddFavoriteTeam(team)}
                                disabled={favoriteActionKey === `team-add-${team.id}`}
                              >
                                Ekle
                              </button>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>
                </section>
              </div>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}
