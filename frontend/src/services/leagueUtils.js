const LEAGUE_COUNTRY_MAP = {
  "Premier League": "England",
  "La Liga": "Spain",
  Bundesliga: "Germany",
  "Serie A": "Italy",
  "Ligue 1": "France",
};

export function inferLeagueCountry(leagueName) {
  if (!leagueName) {
    return null;
  }

  return LEAGUE_COUNTRY_MAP[leagueName] || null;
}
