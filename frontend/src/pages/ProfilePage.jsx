import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getCurrentUserId, normalizeStoredUser, storage } from "../services/api";
import { getProfile, logoutUser } from "../services/authService";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(storage.getUser());
  const [comments, setComments] = useState([]);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentEditForm, setCommentEditForm] = useState({
    text: "",
    rating: 5,
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    surname: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [notificationForm, setNotificationForm] = useState({
    transferUpdates: true,
    matchAlerts: true,
    newsletter: false,
  });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfilePage() {
      const currentUser = storage.getUser();
      if (!currentUser?.id) {
        navigate("/login");
        return;
      }

      try {
        const [user, commentsResponse] = await Promise.all([
          getProfile(currentUser.id),
          api.get(`/users/${currentUser.id}/comments`),
        ]);

        const resolvedComments = await Promise.all(
          (commentsResponse.data.data || []).map(async (comment) => {
            try {
              if (comment.targetType === "team") {
                const { data } = await api.get(`/teams/${comment.targetId}`);
                return {
                  ...comment,
                  targetLabel: data.team?.name || `Takım #${comment.targetId}`,
                };
              }

              const playerTargetId = comment.targetId || comment.playerId;
              const { data } = await api.get(`/players/${playerTargetId}`);
              return {
                ...comment,
                targetLabel: data.player?.name || `Oyuncu #${playerTargetId}`,
              };
            } catch {
              return {
                ...comment,
                targetLabel:
                  comment.targetType === "team"
                    ? `Takım #${comment.targetId}`
                    : `Oyuncu #${comment.targetId || comment.playerId}`,
              };
            }
          })
        );

        setProfile(user);
        setProfileForm({
          name: user.name || "",
          surname: user.surname || "",
          email: user.email || "",
        });
        setNotificationForm({
          transferUpdates: user.notificationPreferences?.transferUpdates ?? true,
          matchAlerts: user.notificationPreferences?.matchAlerts ?? true,
          newsletter: user.notificationPreferences?.newsletter ?? false,
        });
        setComments(resolvedComments);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Profil bilgileri yüklenemedi."
        );
      }
    }

    loadProfilePage();
  }, [navigate]);

  async function handleProfileUpdate(event) {
    event.preventDefault();
    const profileId = getCurrentUserId(profile);

    if (!profileId) {
      setError("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      setFeedback("");
      navigate("/login", { replace: true });
      return;
    }

    try {
      const { data } = await api.put(`/users/${profileId}`, profileForm);
      const updatedUser = normalizeStoredUser(data.user);
      storage.setUser(updatedUser);
      setProfile(updatedUser);
      setProfileForm({
        name: updatedUser?.name || "",
        surname: updatedUser?.surname || "",
        email: updatedUser?.email || "",
      });
      setFeedback("Profil bilgileri güncellendi.");
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Profil güncellenemedi."
      );
      setFeedback("");
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    const profileId = getCurrentUserId(profile);

    if (!profileId) {
      setError("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      setFeedback("");
      navigate("/login", { replace: true });
      return;
    }

    try {
      await api.put(`/users/${profileId}/password`, passwordForm);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
      });
      setFeedback("Şifre başarıyla değiştirildi.");
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Şifre değiştirilemedi."
      );
      setFeedback("");
    }
  }

  async function handleNotificationUpdate(event) {
    event.preventDefault();
    const profileId = getCurrentUserId(profile);

    if (!profileId) {
      setError("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      setFeedback("");
      navigate("/login", { replace: true });
      return;
    }

    try {
      const { data } = await api.put(
        `/users/${profileId}/notifications`,
        notificationForm
      );
      const updatedUser = {
        ...profile,
        notificationPreferences: data.notificationPreferences,
      };
      storage.setUser(updatedUser);
      setProfile(updatedUser);
      setNotificationForm(data.notificationPreferences);
      setFeedback("Bildirim tercihleri güncellendi.");
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Bildirim tercihleri güncellenemedi."
      );
      setFeedback("");
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await api.delete(`/api/comments/${commentId}`);
      setComments((current) =>
        current.filter((comment) => comment._id !== commentId)
      );
      setFeedback("Yorum silindi.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Yorum silinemedi.");
      setFeedback("");
    }
  }

  function startCommentEdit(comment) {
    setEditingCommentId(comment._id);
    setCommentEditForm({
      text: comment.text || "",
      rating: comment.rating || 5,
    });
    setFeedback("");
    setError("");
  }

  function cancelCommentEdit() {
    setEditingCommentId(null);
    setCommentEditForm({
      text: "",
      rating: 5,
    });
  }

  async function handleUpdateComment(commentId) {
    try {
      const payload = {
        text: String(commentEditForm.text || "").trim(),
        rating: Number(commentEditForm.rating),
      };

      if (!payload.text) {
        setError("Yorum metni boş bırakılamaz.");
        setFeedback("");
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
      setFeedback("Yorum güncellendi.");
      setError("");
      cancelCommentEdit();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Yorum güncellenemedi.");
      setFeedback("");
    }
  }

  async function handleDeleteAccount() {
    const profileId = getCurrentUserId(profile);

    if (!profileId) {
      setError("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      setFeedback("");
      navigate("/login", { replace: true });
      return;
    }

    try {
      await api.delete(`/users/${profileId}`);
      await logoutUser();
      navigate("/register", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Hesap silinemedi.");
      setFeedback("");
    }
  }

  function getCommentTargetLabel(comment) {
    return comment.targetType === "team"
      ? `Takım yorumu • ${comment.targetLabel || "Takım"}`
      : `Oyuncu yorumu • ${comment.targetLabel || "Oyuncu"}`;
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">PROFİL YÖNETİMİ</span>
          <h1>Profilini ve yorumlarını yönet</h1>
          <p>E-posta, şifre ve daha önce yazdığın yorumlar tek sayfada.</p>
        </div>
        <div className="hero-actions">
          <Link to="/dashboard" className="button-secondary">
            Dashboard&apos;a Dön
          </Link>
        </div>
      </section>

      {feedback ? <div className="feedback info">{feedback}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-layout">
        <div className="panel">
          <div className="panel-head">
            <div>
              <span>Profil</span>
              <h2>Bilgilerini güncelle</h2>
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
            <button className="button-primary" type="submit">
              Profili Güncelle
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <span>Güvenlik</span>
              <h2>Şifre değiştir</h2>
            </div>
          </div>

          <form className="auth-form" onSubmit={handlePasswordChange}>
            <input
              className="input"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
              placeholder="Mevcut şifre"
              required
            />
            <input
              className="input"
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
              placeholder="Yeni şifre"
              required
            />
            <button className="button-primary" type="submit">
              Şifreyi Değiştir
            </button>
          </form>

          <div style={{ marginTop: 18 }}>
            <button className="button-primary" onClick={handleDeleteAccount}>
              Hesabı Sil
            </button>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <span>Bildirimler</span>
            <h2>Tercihlerini yönet</h2>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleNotificationUpdate}>
          <label className="toggle-row">
            <div>
              <strong>Transfer bildirimleri</strong>
              <p>Favori takım ve oyuncuların transfer hareketlerinden haberdar ol.</p>
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

          <label className="toggle-row">
            <div>
              <strong>Maç alarmları</strong>
              <p>Takip ettiğin takımlar için maç odaklı bildirimler al.</p>
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

          <label className="toggle-row">
            <div>
              <strong>Bülten güncellemeleri</strong>
              <p>Haftalık transfer özeti ve ürün gelişmelerinden haberdar ol.</p>
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

          <button className="button-primary" type="submit">
            Bildirimleri Kaydet
          </button>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <div>
            <span>Yorumlarım</span>
            <h2>Daha önce yazdıkların</h2>
          </div>
        </div>

        <div
          className={`list-stack ${
            comments.length > 4 ? "profile-comments-scroll" : ""
          }`}
        >
          {comments.length ? (
            comments.map((comment) => (
              <article key={comment._id} className="list-item">
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
                        placeholder="Yorumunu güncelle"
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
                    <p>{comment.text}</p>
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
                        onClick={() => handleUpdateComment(comment._id)}
                      >
                        Güncelle
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
                    onClick={() => handleDeleteComment(comment._id)}
                  >
                    Sil
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="stat-box">
              <small>Henüz yorum yok</small>
              <strong>Oyuncu ve takım sayfalarından yorum ekleyebilirsin.</strong>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
