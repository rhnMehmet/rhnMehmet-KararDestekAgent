import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";
import api, { storage } from "../services/api";
import { formatAdminDate } from "../services/adminUtils";

function getInitials(name, surname) {
  return `${name?.[0] || ""}${surname?.[0] || ""}`.toUpperCase() || "U";
}

function getLastCommentDate(user) {
  const latestComment = (user.comments || [])[0];
  return latestComment?.createdAt ? formatAdminDate(latestComment.createdAt) : "Yorum yok";
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(storage.getUser());
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const currentUser = storage.getUser();

    if (!currentUser?.id) {
      navigate("/login", { replace: true });
      return;
    }

    if (currentUser.role !== "admin") {
      navigate("/dashboard", { replace: true });
      return;
    }

    setProfile(currentUser);
  }, [navigate]);

  useEffect(() => {
    async function loadUsers() {
      setLoadingUsers(true);

      try {
        const { data } = await api.get("/admin/users");
        setUsers(data.data || []);
        setSummary(data.summary || null);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Admin kullanıcı listesi yüklenemedi."
        );
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.surname, user.email, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [userSearch, users]);

  const highlightedUser = filteredUsers[0] || users[0] || null;

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <main className="dashboard-page admin-page-shell">
      <section className="admin-directory-hero">
        <div className="admin-directory-copy">
          <span className="eyebrow eyebrow-brand">ADMIN HUB</span>
          <h1>Kullanıcıları tek tek yönet.</h1>
          <p>
            Her kullanıcı için ayrı sayfaya geç, yorumları orada düzenle ve admin
            akışında daha net çalış.
          </p>

          <div className="admin-summary-row">
            <article className="admin-summary-card">
              <small>Toplam kullanıcı</small>
              <strong>{summary?.totalUsers || 0}</strong>
            </article>
            <article className="admin-summary-card">
              <small>Toplam yorum</small>
              <strong>{summary?.totalComments || 0}</strong>
            </article>
            <article className="admin-summary-card">
              <small>Admin sayisi</small>
              <strong>{summary?.totalAdmins || 0}</strong>
            </article>
          </div>
        </div>

        <aside className="admin-spotlight-card">
          <span className="eyebrow eyebrow-muted">Hızlı erişim</span>
          <h2>{profile?.name || "Admin"} için sade admin akışı</h2>
          <p>
            Kullanıcı detayları ayrı sayfada. Bu alanda yalnızca kullanıcı
            yönetimi bulunur.
          </p>
          <div className="admin-hero-actions">
            <Link to="/dashboard" className="button-secondary">
              Dashboard
            </Link>
            <button className="button-secondary" onClick={handleLogout}>
              Çıkış Yap
            </button>
          </div>

          {highlightedUser ? (
            <div className="admin-spotlight-meta">
              <small>Öne çıkan kullanıcı</small>
              <strong>
                {highlightedUser.name} {highlightedUser.surname}
              </strong>
              <p>{highlightedUser.email}</p>
              <span>
                Son yorum hareketi: {getLastCommentDate(highlightedUser)}
              </span>
            </div>
          ) : null}
        </aside>
      </section>

      {feedback ? <div className="feedback info">{feedback}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="panel admin-directory-panel">
        <div className="panel-head admin-directory-head">
          <div>
            <span>Kullanıcı dizini</span>
            <h2>Her kullanıcı için ayrı yönetim sayfası</h2>
          </div>
          <input
            className="input admin-directory-search"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Ad, soyad veya e-posta ara"
          />
        </div>

        <div className="admin-directory-grid">
          {loadingUsers ? (
            <div className="stat-box">
              <small>Yükleniyor</small>
              <strong>Kullanıcı kartları hazırlanıyor.</strong>
            </div>
          ) : filteredUsers.length ? (
            filteredUsers.map((user) => (
              <article key={user.id} className="admin-directory-card">
                <div className="admin-directory-card-top">
                  <div className="admin-user-badge">
                    {getInitials(user.name, user.surname)}
                  </div>
                  <div className="admin-directory-card-copy">
                    <span>{user.role === "admin" ? "Admin" : "Kullanıcı"}</span>
                    <h3>
                      {user.name} {user.surname}
                    </h3>
                    <p>{user.email}</p>
                  </div>
                </div>

                <div className="admin-directory-stats">
                  <div>
                    <small>Yorum</small>
                    <strong>{user.stats?.commentCount || 0}</strong>
                  </div>
                  <div>
                    <small>Fav. oyuncu</small>
                    <strong>{user.stats?.favoritePlayers || 0}</strong>
                  </div>
                  <div>
                    <small>Fav. takım</small>
                    <strong>{user.stats?.favoriteTeams || 0}</strong>
                  </div>
                </div>

                <div className="admin-directory-footer">
                  <div>
                    <small>Kayıt tarihi</small>
                    <p>{formatAdminDate(user.createdAt)}</p>
                  </div>
                  <button
                    className="button-primary"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                  >
                    Sayfayı Aç
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="stat-box">
              <small>Sonuç yok</small>
              <strong>Aramana uygun kullanıcı bulunamadı.</strong>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
