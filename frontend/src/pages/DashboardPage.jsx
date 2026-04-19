import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, {
  fetchLeaguePlayers,
  fetchLeagueTeams,
  getCurrentUserId,
  resolvePlayerById,
  resolveTeamById,
  storage,
  updateStoredUserFavorites,
} from "../services/api";
import { getProfile, logoutUser } from "../services/authService";
import DashboardStudioLayout from "../components/DashboardStudioLayout";

const initialState = {
  teams: [],
  transfers: [],
  comments: [],
  prediction: null,
  valuePrediction: null,
  favoritePlayers: [],
  favoriteTeams: [],
};

const LEAGUES = [
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
];

const LEAGUE_ROUTE_MAP = {
  "Premier League": "premier-league",
  "La Liga": "la-liga",
  Bundesliga: "bundesliga",
  "Serie A": "serie-a",
  "Ligue 1": "ligue-1",
};

function formatContractPressure(value) {
  if (value === "high") {
    return "Yüksek";
  }
  if (value === "medium") {
    return "Orta";
  }
  if (value === "low") {
    return "Düşük";
  }
  return "Bilinmiyor";
}

function formatMillionValue(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return `${numeric.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} M EUR`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(initialState);
  const [profile, setProfile] = useState(storage.getUser());
  const [selectedPlayerId, setSelectedPlayerId] = useState(6983809);
  const [selectedLeague, setSelectedLeague] = useState("Premier League");
  const [aiSourceLeague, setAiSourceLeague] = useState("Premier League");
  const [teamSearch, setTeamSearch] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingLeagueData, setLoadingLeagueData] = useState(true);
  const [loadingPrediction, setLoadingPrediction] = useState(true);
  const [loadingAiPlayers, setLoadingAiPlayers] = useState(true);
  const [favoriteTeamLoadingId, setFavoriteTeamLoadingId] = useState(null);
  const [aiTargetLeague, setAiTargetLeague] = useState("Premier League");
  const [aiTargetTeamId, setAiTargetTeamId] = useState("");
  const [aiTargetTeams, setAiTargetTeams] = useState([]);
  const [aiPlayers, setAiPlayers] = useState([]);
  const [loadingAiTeams, setLoadingAiTeams] = useState(true);
  const [aiPlayerSearch, setAiPlayerSearch] = useState("");
  const [aiTargetTeamSearch, setAiTargetTeamSearch] = useState("");
  const [openAiPicker, setOpenAiPicker] = useState(null);
  const aiPlayersCacheRef = useRef({});
  const aiTargetTeamsCacheRef = useRef({});

  async function resolveDashboardComments(comments) {
    return Promise.all(
      (comments || []).map(async (comment) => {
        try {
          if (comment.targetType === "team") {
            const resolvedTeam = await resolveTeamById(comment.targetId);
            return {
              ...comment,
              targetLabel: resolvedTeam?.name || `Takım #${comment.targetId}`,
            };
          }

          const playerTargetId = comment.targetId || comment.playerId;
          const resolvedPlayer = await resolvePlayerById(playerTargetId);
          return {
            ...comment,
            targetLabel: resolvedPlayer?.name || `Oyuncu #${playerTargetId}`,
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
  }

  useEffect(() => {
    async function loadBaseDashboard() {
      const currentUser = storage.getUser();
      if (!currentUser?.id) {
        navigate("/login");
        return;
      }

      setLoadingBase(true);

      try {
        const [userProfile, transfersResponse] =
          await Promise.all([
            getProfile(currentUser.id),
            api.get("/transfers?limit=6"),
          ]);

        const favoritePlayers = await Promise.all(
          (userProfile?.favorites?.players || []).map(async (playerId) => {
            try {
              return await resolvePlayerById(playerId);
            } catch {
              return null;
            }
          })
        );

        const favoriteTeams = await Promise.all(
          (userProfile?.favorites?.teams || []).map(async (teamId) => {
            try {
              return await resolveTeamById(teamId);
            } catch {
              return null;
            }
          })
        );

        setProfile(userProfile);
        setData((current) => ({
          ...current,
          transfers: transfersResponse.data.data || [],
          favoritePlayers: favoritePlayers.filter(Boolean),
          favoriteTeams: favoriteTeams.filter(Boolean),
        }));
      } catch (error) {
        setFeedback(
          error.response?.data?.message || "Dashboard verileri yüklenemedi."
        );
      } finally {
        setLoadingBase(false);
      }
    }

    loadBaseDashboard();
  }, [navigate]);

  useEffect(() => {
    async function loadSelectedPlayerComments() {
      if (!selectedPlayerId) {
        setData((current) => ({
          ...current,
          comments: [],
        }));
        return;
      }

      try {
        const commentsResponse = await api.get(
          `/api/players/${selectedPlayerId}/comments?limit=20`
        );
        const resolvedComments = await resolveDashboardComments(
          commentsResponse.data.data || []
        );

        setData((current) => ({
          ...current,
          comments: resolvedComments,
        }));
      } catch {
        setData((current) => ({
          ...current,
          comments: [],
        }));
      }
    }

    loadSelectedPlayerComments();
  }, [selectedPlayerId]);

  useEffect(() => {
    async function loadLeagueData() {
      setLoadingLeagueData(true);

      try {
        const nextTeams = await fetchLeagueTeams(selectedLeague);

        setData((current) => ({
          ...current,
          teams: nextTeams,
        }));
      } catch (error) {
        setFeedback(
          error.response?.data?.message || "Lig verileri yüklenemedi."
        );
      } finally {
        setLoadingLeagueData(false);
      }
    }

    loadLeagueData();
  }, [selectedLeague]);

  useEffect(() => {
    async function loadAiPlayers() {
      if (aiPlayersCacheRef.current[aiSourceLeague]) {
        const cachedPlayers = aiPlayersCacheRef.current[aiSourceLeague];
        setAiPlayers(cachedPlayers);
        setSelectedPlayerId((currentPlayerId) => {
          const currentExists = cachedPlayers.some(
            (player) => Number(player.id) === Number(currentPlayerId)
          );
          if (currentExists) {
            return currentPlayerId;
          }
          return cachedPlayers[0]?.id || currentPlayerId;
        });
        setLoadingAiPlayers(false);
        return;
      }

      setLoadingAiPlayers(true);

      try {
        const nextPlayers = await fetchLeaguePlayers(aiSourceLeague, { limit: 1000 });

        aiPlayersCacheRef.current[aiSourceLeague] = nextPlayers;
        setAiPlayers(nextPlayers);
        setSelectedPlayerId((currentPlayerId) => {
          const currentExists = nextPlayers.some(
            (player) => Number(player.id) === Number(currentPlayerId)
          );
          if (currentExists) {
            return currentPlayerId;
          }
          return nextPlayers[0]?.id || currentPlayerId;
        });
      } catch (error) {
        setAiPlayers([]);
        setFeedback(
          error.response?.data?.message || "AI oyuncuları yüklenemedi."
        );
      } finally {
        setLoadingAiPlayers(false);
      }
    }

    loadAiPlayers();
  }, [aiSourceLeague]);

  useEffect(() => {
    async function loadAiTargetTeams() {
      if (aiTargetTeamsCacheRef.current[aiTargetLeague]) {
        setAiTargetTeams(aiTargetTeamsCacheRef.current[aiTargetLeague]);
        setLoadingAiTeams(false);
        return;
      }

      setLoadingAiTeams(true);

      try {
        const nextTeams = await fetchLeagueTeams(aiTargetLeague);
        aiTargetTeamsCacheRef.current[aiTargetLeague] = nextTeams;
        setAiTargetTeams(nextTeams);
      } catch (error) {
        setAiTargetTeams([]);
      } finally {
        setLoadingAiTeams(false);
      }
    }

    loadAiTargetTeams();
  }, [aiTargetLeague]);

  useEffect(() => {
    async function loadPredictionData() {
      if (!selectedPlayerId) {
        return;
      }

      setLoadingPrediction(true);

      try {
        const [predictionResponse, valueResponse] = await Promise.all([
          api.post("/ai/transfer-predictions", {
            playerId: selectedPlayerId,
            preferredLeague: aiTargetLeague,
            targetTeamId: aiTargetTeamId || undefined,
          }),
          api.get(`/ai/player-value/${selectedPlayerId}`),
        ]);

        setData((current) => ({
          ...current,
          prediction: predictionResponse.data,
          valuePrediction: valueResponse.data,
        }));
      } catch (error) {
        setFeedback(error.response?.data?.message || "AI verileri yüklenemedi.");
      } finally {
        setLoadingPrediction(false);
      }
    }

    loadPredictionData();
  }, [selectedPlayerId, aiTargetLeague, aiTargetTeamId]);

  function isFavoriteTeam(teamId) {
    return data.favoriteTeams.some((team) => Number(team.id) === Number(teamId));
  }

  async function handleToggleFavoriteTeam(team) {
    const profileId = getCurrentUserId(profile);
    const teamId = team.id;
    const currentlyFavorite = isFavoriteTeam(teamId);

    if (!profileId) {
      setFeedback("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yap.");
      navigate("/login", { replace: true });
      return;
    }

    setFavoriteTeamLoadingId(teamId);
    setData((current) => ({
      ...current,
      favoriteTeams: currentlyFavorite
        ? current.favoriteTeams.filter((item) => Number(item.id) !== Number(teamId))
        : current.favoriteTeams.some((item) => Number(item.id) === Number(teamId))
        ? current.favoriteTeams
        : [...current.favoriteTeams, team],
    }));

    try {
      if (currentlyFavorite) {
        await api.delete(`/users/${profileId}/favorites/teams/${teamId}`);
        setFeedback("Takım favorilerden çıkarıldı.");
      } else {
        await api.post(`/users/${profileId}/favorites/teams`, { teamId });
        setFeedback("Takım favorilere eklendi.");
      }

      setProfile((current) =>
        updateStoredUserFavorites("team", teamId, !currentlyFavorite) || current
      );
    } catch (error) {
      setData((current) => ({
        ...current,
        favoriteTeams: currentlyFavorite
          ? current.favoriteTeams.some((item) => Number(item.id) === Number(teamId))
            ? current.favoriteTeams
            : [...current.favoriteTeams, team]
          : current.favoriteTeams.filter((item) => Number(item.id) !== Number(teamId)),
      }));
      setFeedback(
        error.response?.data?.message ||
          (currentlyFavorite
            ? "Takım favorilerden çıkarılamadı."
            : "Favori takım eklenemedi.")
      );
    } finally {
      setFavoriteTeamLoadingId(null);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      window.location.replace("/login");
    }
  }

  const filteredTeams = data.teams.filter((team) =>
    team.name.toLowerCase().includes(teamSearch.toLowerCase())
  );
  const visibleTeams = filteredTeams;
  const selectedPlayer = aiPlayers.find(
    (player) => Number(player.id) === Number(selectedPlayerId)
  );
  const selectedAiTargetTeam = aiTargetTeams.find(
    (team) => String(team.id) === String(aiTargetTeamId)
  );
  const visibleAiPlayers = aiPlayers
    .filter((player) =>
      player.name.toLowerCase().includes(aiPlayerSearch.toLowerCase())
    );
  const visibleAiTargetTeams = aiTargetTeams
    .filter((team) =>
      team.name.toLowerCase().includes(aiTargetTeamSearch.toLowerCase())
    );
  const favoriteCount = data.favoriteTeams.length + data.favoritePlayers.length;

  return (
    <DashboardStudioLayout
      profile={profile}
      feedback={feedback}
      favoriteCount={favoriteCount}
      selectedLeague={selectedLeague}
      setSelectedLeague={setSelectedLeague}
      leagues={LEAGUES}
      leagueRouteMap={LEAGUE_ROUTE_MAP}
      navigate={navigate}
      onLogout={handleLogout}
      aiSourceLeague={aiSourceLeague}
      setAiSourceLeague={setAiSourceLeague}
      aiPlayerSearch={aiPlayerSearch}
      setAiPlayerSearch={setAiPlayerSearch}
      openAiPicker={openAiPicker}
      setOpenAiPicker={setOpenAiPicker}
      loadingAiPlayers={loadingAiPlayers}
      loadingPrediction={loadingPrediction}
      selectedPlayer={selectedPlayer}
      selectedPlayerId={selectedPlayerId}
      setSelectedPlayerId={setSelectedPlayerId}
      visibleAiPlayers={visibleAiPlayers}
      aiTargetLeague={aiTargetLeague}
      setAiTargetLeague={setAiTargetLeague}
      aiTargetTeamId={aiTargetTeamId}
      setAiTargetTeamId={setAiTargetTeamId}
      aiTargetTeamSearch={aiTargetTeamSearch}
      setAiTargetTeamSearch={setAiTargetTeamSearch}
      loadingAiTeams={loadingAiTeams}
      selectedAiTargetTeam={selectedAiTargetTeam}
      visibleAiTargetTeams={visibleAiTargetTeams}
      data={data}
      formatContractPressure={formatContractPressure}
    />
  );
}


