import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { resolveLeagueMeta } from "../services/api";
import { getEntityImage, getInitials, getLeagueLogo } from "../services/brandAssets";
import { inferLeagueCountry } from "../services/leagueUtils";

const LEAGUE_SLUG_MAP = {
  "premier-league": "Premier League",
  "la-liga": "La Liga",
  bundesliga: "Bundesliga",
  "serie-a": "Serie A",
  "ligue-1": "Ligue 1",
};

export default function LeaguePage() {
  const navigate = useNavigate();
  const { leagueSlug } = useParams();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leagueMeta, setLeagueMeta] = useState(null);

  const leagueName = useMemo(
    () => LEAGUE_SLUG_MAP[leagueSlug] || "Premier League",
    [leagueSlug]
  );

  useEffect(() => {
    resolveLeagueMeta(leagueName).then(setLeagueMeta).catch(() => setLeagueMeta(null));
  }, [leagueName]);

  useEffect(() => {
    async function loadLeagueTeams() {
      setLoading(true);
      setError("");

      try {
        const { data } = await api.get(
          `/teams?limit=100&league=${encodeURIComponent(leagueName)}`
        );
        const nextTeams = data.data || [];
        setTeams(nextTeams);
        localStorage.setItem(
          `transfera_league_teams_${leagueName}`,
          JSON.stringify(nextTeams)
        );
      } catch (requestError) {
        const cachedTeams = localStorage.getItem(`transfera_league_teams_${leagueName}`);
        if (cachedTeams) {
          setTeams(JSON.parse(cachedTeams));
          setError("Canlı veriye ulaşılamadı, son kayıtlı takım listesi gösteriliyor.");
        } else {
          setError(requestError.response?.data?.message || "Lig takımları yüklenemedi.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadLeagueTeams();
  }, [leagueName]);

  return (
    <main className="dashboard-page league-page-premium">
      <section className="league-showcase-hero">
        <div className="league-showcase-copy">
          <span className="eyebrow">LİG SAYFASI</span>

          <div className="league-showcase-title">
            <div className="league-showcase-mark">
              {leagueMeta?.imagePath || getLeagueLogo(leagueName) ? (
                <img src={leagueMeta?.imagePath || getLeagueLogo(leagueName)} alt={leagueName} />
              ) : (
                <span>{getInitials(leagueName)}</span>
              )}
            </div>

            <div>
              <h1>{leagueName}</h1>
              <p>
                Bu ligdeki takımları görüntüleyip takım detay sayfasına geçebilirsin.
              </p>
            </div>
          </div>

          <div className="league-showcase-stats">
            <article className="league-showcase-stat">
              <span>Toplam kulüp</span>
              <strong>{loading ? "-" : teams.length}</strong>
            </article>
            <article className="league-showcase-stat">
              <span>Ülke</span>
              <strong>{inferLeagueCountry(leagueName) || "-"}</strong>
            </article>
          </div>
        </div>

        <div className="league-showcase-actions">
          <button className="button-secondary league-showcase-button" onClick={() => navigate(-1)}>
            Back
          </button>
          <Link to="/dashboard" className="button-primary league-showcase-button">
            Dashboard
          </Link>
        </div>
      </section>

      {error ? <div className="feedback error">{error}</div> : null}

      <section className="league-club-stage">
        <div className="panel-head league-club-stage-head">
          <div>
            <span>Kulüpler</span>
            <h2>{leagueName} takımları</h2>
          </div>
        </div>

        {loading ? (
          <p>Takımlar yükleniyor...</p>
        ) : (
          <div className="league-club-grid">
            {teams.map((team) => (
              <article key={team.id} className="league-club-card">
                <div className="league-club-crest">
                  <div className="league-club-avatar">
                    {getEntityImage(team) ? (
                      <img src={getEntityImage(team)} alt={team.name} />
                    ) : (
                      <span>{getInitials(team.name)}</span>
                    )}
                  </div>
                </div>

                <div className="league-club-copy">
                  <h3>{team.name}</h3>
                  <p>{team.country || inferLeagueCountry(leagueName) || "-"}</p>
                </div>

                <div className="league-club-meta">
                  <span>Kuruluş</span>
                  <strong>{team.founded || "-"}</strong>
                </div>

                {team.venue ? <p className="league-club-venue">{team.venue}</p> : null}

                <button
                  className="button-secondary league-club-button"
                  onClick={() =>
                    navigate(`/teams/${team.id}`, {
                      state: { leagueName, teamName: team.name },
                    })
                  }
                >
                  Team Details
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
