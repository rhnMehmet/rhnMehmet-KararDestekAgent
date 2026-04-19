import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { storage } from "../services/api";

const LEAGUES = [
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
];

const emptyPlayerForm = {
  name: "",
  firstname: "",
  lastname: "",
  age: "",
  nationality: "",
  position: "",
  detailedPosition: "",
  dateOfBirth: "",
  imagePath: "",
  teamId: "",
  teamName: "",
  teamLeague: "",
};

function createPlayerForm(player) {
  return {
    name: player?.name || "",
    firstname: player?.firstname || "",
    lastname: player?.lastname || "",
    age: player?.age ?? "",
    nationality: player?.nationality || "",
    position: player?.position || "",
    detailedPosition: player?.detailedPosition || "",
    dateOfBirth: player?.dateOfBirth || "",
    imagePath: player?.imagePath || "",
    teamId: player?.team?.id ?? "",
    teamName: player?.team?.name || "",
    teamLeague: player?.team?.league || player?.league || "",
  };
}

export default function AdminPlayersPage() {
  const navigate = useNavigate();
  const [playerLeague, setPlayerLeague] = useState("Premier League");
  const [playerSearch, setPlayerSearch] = useState("");
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerForm, setPlayerForm] = useState(emptyPlayerForm);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingPlayerDetail, setLoadingPlayerDetail] = useState(false);
  const [savingPlayer, setSavingPlayer] = useState(false);
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
    }
  }, [navigate]);

  useEffect(() => {
    async function loadPlayers() {
      setLoadingPlayers(true);

      try {
        const { data } = await api.get(
          `/players?league=${encodeURIComponent(playerLeague)}&limit=1000`
        );
        const nextPlayers = data.data || [];
        setPlayers(nextPlayers);
        setSelectedPlayerId((current) => {
          const currentExists = nextPlayers.some(
            (player) => Number(player.id) === Number(current)
          );

          if (currentExists) {
            return current;
          }

          return nextPlayers[0]?.id || null;
        });
      } catch (requestError) {
        setPlayers([]);
        setSelectedPlayerId(null);
        setError(
          requestError.response?.data?.message || "Oyuncu listesi y?klenemedi."
        );
      } finally {
        setLoadingPlayers(false);
      }
    }

    loadPlayers();
  }, [playerLeague]);

  useEffect(() => {
    async function loadPlayerDetail() {
      if (!selectedPlayerId) {
        setSelectedPlayer(null);
        setPlayerForm(emptyPlayerForm);
        return;
      }

      setLoadingPlayerDetail(true);

      try {
        const { data } = await api.get(`/players/${selectedPlayerId}`);
        setSelectedPlayer(data.player || null);
        setPlayerForm(createPlayerForm(data.player || null));
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Oyuncu detay bilgileri y?klenemedi."
        );
      } finally {
        setLoadingPlayerDetail(false);
      }
    }

    loadPlayerDetail();
  }, [selectedPlayerId]);

  const filteredPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();

    if (!query) {
      return players;
    }

    return players.filter((player) =>
      [player.name, player.team?.name, player.position, player.nationality]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [playerSearch, players]);

  async function handlePlayerSave(event) {
    event.preventDefault();
    setSavingPlayer(true);

    try {
      await api.put(`/admin/players/${selectedPlayerId}`, {
        name: playerForm.name,
        firstname: playerForm.firstname,
        lastname: playerForm.lastname,
        age: playerForm.age,
        nationality: playerForm.nationality,
        position: playerForm.position,
        detailedPosition: playerForm.detailedPosition,
        dateOfBirth: playerForm.dateOfBirth,
        imagePath: playerForm.imagePath,
        team: {
          id: playerForm.teamId,
          name: playerForm.teamName,
          league: playerForm.teamLeague,
        },
      });

      const { data } = await api.get(`/players/${selectedPlayerId}`);
      setSelectedPlayer(data.player || null);
      setPlayerForm(createPlayerForm(data.player || null));
      setPlayers((currentPlayers) =>
        currentPlayers.map((player) =>
          Number(player.id) === Number(selectedPlayerId)
            ? {
                ...player,
                ...data.player,
              }
            : player
        )
      );
      setFeedback("Oyuncu bilgileri g?ncellendi.");
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Oyuncu bilgileri g?ncellenemedi."
      );
    } finally {
      setSavingPlayer(false);
    }
  }

  return (
    <main className="dashboard-page admin-page-shell">
      <section className="admin-user-hero">
        <div className="admin-user-hero-copy">
          <span className="eyebrow eyebrow-brand">OYUNCU Y?NET?M?</span>
          <h1>Oyuncu verilerini daha temiz bir ak??ta g?ncelle.</h1>
          <p>
            Kullan?c? y?netimiyle kar??madan, se?ili ligdeki oyuncular? burada
            tek tek d?zenleyebilirsin.
          </p>
        </div>

        <div className="admin-hero-actions admin-hero-actions-vertical">
          <Link to="/admin" className="button-secondary">
            Kullan?c? Dizini
          </Link>
          <Link to="/dashboard" className="button-secondary">
            Dashboard
          </Link>
        </div>
      </section>

      {feedback ? <div className="feedback info">{feedback}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="dashboard-layout admin-user-layout">
        <div className="panel">
          <div className="panel-head">
            <div>
              <span>Oyuncu listesi</span>
              <h2>Lig se?, ara ve oyuncuyu a?</h2>
            </div>
          </div>

          <div className="team-league-picker">
            {LEAGUES.map((league) => (
              <button
                key={league}
                type="button"
                className={`chip ${playerLeague === league ? "chip-active" : ""}`}
                onClick={() => setPlayerLeague(league)}
              >
                {league}
              </button>
            ))}
          </div>

          <input
            className="input"
            value={playerSearch}
            onChange={(event) => setPlayerSearch(event.target.value)}
            placeholder="Oyuncu veya tak?m ara"
          />

          <div className="admin-player-list admin-player-list-tall">
            {loadingPlayers ? (
              <p>Oyuncular y?kleniyor...</p>
            ) : (
              filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className={`modern-picker-option ${
                    Number(selectedPlayerId) === Number(player.id)
                      ? "modern-picker-option-active"
                      : ""
                  }`}
                  onClick={() => setSelectedPlayerId(player.id)}
                >
                  <strong>{player.name}</strong>
                  <small>
                    {player.team?.name || "Tak?m yok"} • {player.position || "-"}
                  </small>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="panel panel-highlight">
          <div className="panel-head">
            <div>
              <span>Duzenleme formu</span>
              <h2>Se?ili oyuncu bilgileri</h2>
            </div>
          </div>

          {loadingPlayerDetail ? (
            <p>Oyuncu detay? y?kleniyor...</p>
          ) : selectedPlayer ? (
            <form className="auth-form" onSubmit={handlePlayerSave}>
              <div className="auth-grid">
                <input
                  className="input"
                  value={playerForm.name}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Tam ad"
                />
                <input
                  className="input"
                  value={playerForm.age}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      age: event.target.value,
                    }))
                  }
                  placeholder="Yas"
                />
              </div>

              <div className="auth-grid">
                <input
                  className="input"
                  value={playerForm.firstname}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      firstname: event.target.value,
                    }))
                  }
                  placeholder="Ad"
                />
                <input
                  className="input"
                  value={playerForm.lastname}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      lastname: event.target.value,
                    }))
                  }
                  placeholder="Soyad"
                />
              </div>

              <div className="auth-grid">
                <input
                  className="input"
                  value={playerForm.position}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      position: event.target.value,
                    }))
                  }
                  placeholder="Pozisyon"
                />
                <input
                  className="input"
                  value={playerForm.detailedPosition}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      detailedPosition: event.target.value,
                    }))
                  }
                  placeholder="Detay pozisyon"
                />
              </div>

              <div className="auth-grid">
                <input
                  className="input"
                  value={playerForm.nationality}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      nationality: event.target.value,
                    }))
                  }
                  placeholder="Uyruk"
                />
                <input
                  className="input"
                  value={playerForm.dateOfBirth}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      dateOfBirth: event.target.value,
                    }))
                  }
                  placeholder="Dogum tarihi"
                />
              </div>

              <div className="auth-grid">
                <input
                  className="input"
                  value={playerForm.teamId}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      teamId: event.target.value,
                    }))
                  }
                  placeholder="Tak?m ID"
                />
                <input
                  className="input"
                  value={playerForm.teamName}
                  onChange={(event) =>
                    setPlayerForm((current) => ({
                      ...current,
                      teamName: event.target.value,
                    }))
                  }
                  placeholder="Tak?m ad?"
                />
              </div>

              <input
                className="input"
                value={playerForm.teamLeague}
                onChange={(event) =>
                  setPlayerForm((current) => ({
                    ...current,
                    teamLeague: event.target.value,
                  }))
                }
                placeholder="Tak?m ligi"
              />

              <input
                className="input"
                value={playerForm.imagePath}
                onChange={(event) =>
                  setPlayerForm((current) => ({
                    ...current,
                    imagePath: event.target.value,
                  }))
                }
                placeholder="Gorsel URL"
              />

              <div className="stat-box">
                <small>Se?ili oyuncu</small>
                <strong>{selectedPlayer.name}</strong>
                <p>
                  {selectedPlayer.team?.name || "Tak?m yok"} •{" "}
                  {selectedPlayer.position || "Pozisyon yok"}
                </p>
              </div>

              <button className="button-primary" type="submit" disabled={savingPlayer}>
                {savingPlayer ? "Kaydediliyor..." : "Oyuncuyu G?ncelle"}
              </button>
            </form>
          ) : (
            <div className="stat-box">
              <small>Oyuncu se?ilmedi</small>
              <strong>D?zenlemek i?in soldan bir oyuncu se?.</strong>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
