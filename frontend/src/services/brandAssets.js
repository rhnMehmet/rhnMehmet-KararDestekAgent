import premierLeagueLogo from "../assets/leagues/premier-league.svg";
import laLigaLogo from "../assets/leagues/la-liga.svg";
import bundesligaLogo from "../assets/leagues/bundesliga.svg";
import serieALogo from "../assets/leagues/serie-a.svg";
import ligue1Logo from "../assets/leagues/ligue-1.svg";

const LEAGUE_LOGOS = {
  "Premier League": premierLeagueLogo,
  "La Liga": laLigaLogo,
  Bundesliga: bundesligaLogo,
  "Serie A": serieALogo,
  "Ligue 1": ligue1Logo,
};

export function getLeagueLogo(leagueName) {
  try {
    const cached = localStorage.getItem(`transfera_league_meta_${leagueName}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.imagePath) {
        return parsed.imagePath;
      }
    }
  } catch {
    // ignore local cache parsing problems
  }

  return LEAGUE_LOGOS[leagueName] || null;
}

export function getInitials(name = "") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function getEntityImage(entity) {
  return entity?.imagePath || entity?.image_path || null;
}
