import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getCurrentUserId, resolveTeamLeague, storage } from "../services/api";
import { getProfile } from "../services/authService";
import { getEntityImage, getInitials } from "../services/brandAssets";

export default function FavoritePlayersPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(storage.getUser());
  const [favoritePlayers, setFavoritePlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    async function loadFavorites() {
      const currentUser = storage.getUser();
      if (!currentUser?.id) {
        navigate("/login");
        return;
      }

      const refreshedProfile = await getProfile(currentUser.id);
      setProfile(refreshedProfile);

      const players = await Promise.all(
        (refreshedProfile.favorites?.players || []).map(async (playerId) => {
          try {
            const { data } = await api.get(`/players/${playerId}`);
            const leagueName =
              data.player?.team?.league ||
              data.player?.league ||
              (await resolveTeamLeague(data.player?.team?.id));
            return {
              ...data.player,
              league: leagueName || data.player?.league || null,
              team: data.player?.team
                ? {
                    ...data.player.team,
                    league: leagueName || data.player.team.league || null,
                  }
                : data.player?.team,
            };
          } catch {
            return null;
          }
        })
      );

      setFavoritePlayers(players.filter(Boolean));
    }

    loadFavorites();
  }, [navigate]);

  useEffect(() => {
    async function searchPlayers() {
      if (!search.trim()) {
        setResults([]);
        return;
      }

      try {
        const { data } = await api.get(
          `/players?search=${encodeURIComponent(search)}&limit=8`
        );
        const playersWithLeague = await Promise.all(
          (data.data || []).map(async (player) => {
            const leagueName =
              player.team?.league ||
              player.league ||
              (await resolveTeamLeague(player.team?.id));
            return {
              ...player,
              league: leagueName || player.league || null,
              team: player.team
                ? {
                    ...player.team,
                    league: leagueName || player.team.league || null,
                  }
                : player.team,
            };
          })
        );
        setResults(playersWithLeague);
      } catch {
        setResults([]);
      }
    }

    const timeout = setTimeout(searchPlayers, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  async function addFavoritePlayer(playerId) {
    const profileId = getCurrentUserId(profile);

    if (!profileId) {
      setFeedback("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      await api.post(`/users/${profileId}/favorites/players`, { playerId });
      const refreshedProfile = await getProfile(profileId);
      setProfile(refreshedProfile);

      const { data } = await api.get(`/players/${playerId}`);
      const leagueName =
        data.player?.team?.league ||
        data.player?.league ||
        (await resolveTeamLeague(data.player?.team?.id));

      setFavoritePlayers((current) =>
        current.some((player) => player.id === playerId)
          ? current
          : [
              ...current,
              {
                ...data.player,
                league: leagueName || data.player?.league || null,
                team: data.player?.team
                  ? {
                      ...data.player.team,
                      league: leagueName || data.player.team.league || null,
                    }
                  : data.player?.team,
              },
            ]
      );
      setFeedback("Oyuncu favorilere eklendi.");
    } catch (error) {
      setFeedback(error.response?.data?.message || "Oyuncu eklenemedi.");
    }
  }

  async function removeFavoritePlayer(playerId) {
    const profileId = getCurrentUserId(profile);

    if (!profileId) {
      setFeedback("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      await api.delete(`/users/${profileId}/favorites/players/${playerId}`);
      const refreshedProfile = await getProfile(profileId);
      setProfile(refreshedProfile);
      setFavoritePlayers((current) =>
        current.filter((player) => player.id !== playerId)
      );
      setFeedback("Oyuncu favorilerden silindi.");
    } catch (error) {
      setFeedback(error.response?.data?.message || "Oyuncu silinemedi.");
    }
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">FAVORİ OYUNCULAR</span>
          <h1>Favori oyuncu listen</h1>
          <p>Oyuncu ara, favorilere ekle ve listeni tek sayfadan yönet.</p>
        </div>
        <div className="hero-actions">
          <Link to="/dashboard" className="button-secondary">
            Dashboard&apos;a Dön
          </Link>
        </div>
      </section>

      {feedback ? <div className="feedback info">{feedback}</div> : null}

      <section className="dashboard-layout">
        <div className="panel">
          <div className="panel-head">
            <div>
              <span>Arama</span>
              <h2>Oyuncu bul ve ekle</h2>
            </div>
          </div>
          <input
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Oyuncu adı ara"
          />
          <div className="list-stack" style={{ marginTop: 16 }}>
            {results.map((player) => (
              <article key={player.id} className="list-item">
                <div className="list-item-main">
                  <div className="entity-avatar entity-avatar-sm">
                    {getEntityImage(player) ? (
                      <img src={getEntityImage(player)} alt={player.name} />
                    ) : (
                      <span>{getInitials(player.name)}</span>
                    )}
                  </div>
                  <div>
                    <h3>{player.name}</h3>
                    <p>
                      {player.team?.name || "Kulüp bilgisi yok"}
                      {player.team?.league ? ` • ${player.team.league}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  className="button-secondary"
                  onClick={() => addFavoritePlayer(player.id)}
                >
                  Ekle
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <span>Liste</span>
              <h2>Mevcut favoriler</h2>
            </div>
          </div>
          <div className="list-stack">
            {favoritePlayers.map((player) => (
              <article key={player.id} className="list-item">
                <div className="list-item-main">
                  <div className="entity-avatar entity-avatar-sm">
                    {getEntityImage(player) ? (
                      <img src={getEntityImage(player)} alt={player.name} />
                    ) : (
                      <span>{getInitials(player.name)}</span>
                    )}
                  </div>
                  <div>
                    <h3>{player.name}</h3>
                    <p>
                      {player.team?.name || "Kulüp bilgisi yok"}
                      {player.team?.league ? ` • ${player.team.league}` : ""}
                    </p>
                  </div>
                </div>
                <div className="hero-actions">
                  <button
                    className="button-secondary"
                    onClick={() =>
                      navigate(`/players/${player.id}`, {
                        state: {
                          leagueName: player.team?.league || player.league || null,
                          teamName: player.team?.name || null,
                          returnTo: "/favorites/players",
                        },
                      })
                    }
                  >
                    Detay
                  </button>
                  <button
                    className="button-primary"
                    onClick={() => removeFavoritePlayer(player.id)}
                  >
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
