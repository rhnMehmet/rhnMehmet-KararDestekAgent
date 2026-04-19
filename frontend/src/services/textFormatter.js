const TOKEN_MAP = {
  Guler: "G\u00fcler",
  Caglar: "\u00c7a\u011flar",
  Calhanoglu: "\u00c7alhano\u011flu",
  Ozkacar: "\u00d6zkacar",
  Soyuncu: "S\u00f6y\u00fcnc\u00fc",
  Turkiye: "T\u00fcrkiye",
  Besiktas: "Be\u015fikta\u015f",
  Fenerbahce: "Fenerbah\u00e7e",
  Goztepe: "G\u00f6ztepe",
  Basaksehir: "Ba\u015fak\u015fehir",
  Kayserispor: "Kayserispor",
  Genclerbirligi: "Gen\u00e7lerbirli\u011fi",
  Corum: "\u00c7orum",
};

const MOJIBAKE_REPLACEMENTS = [
  ["ÃƒÂ¼", "ü"],
  ["ÃƒÅ“", "Ü"],
  ["ÃƒÂ¶", "ö"],
  ["Ãƒâ€“", "Ö"],
  ["ÃƒÂ§", "ç"],
  ["Ãƒâ€¡", "Ç"],
  ["Ã„Â±", "ı"],
  ["Ã„Â°", "İ"],
  ["Ã…Å¸", "ş"],
  ["Ã…Å¾", "Ş"],
  ["Ã„Å¸", "ğ"],
  ["Ã„Å¾", "Ğ"],
  ["Ã¢â€ â€™", "→"],
  ["â†’", "→"],
  ["Ã¢â‚¬Â¢", "•"],
  ["Ã¢â‚¬â„¢", "'"],
  ['Ã¢â‚¬Å“', '"'],
  ['Ã¢â‚¬Â', '"'],
  ["Ã¢â‚¬â€œ", "-"],
  ["Ã¢â‚¬â€", "-"],
  ["Ã‚", ""],
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatEntityText(value) {
  if (!value) {
    return value;
  }

  let formatted = String(value);

  for (const [source, target] of Object.entries(TOKEN_MAP)) {
    const pattern = new RegExp(`\\b${escapeRegExp(source)}\\b`, "g");
    formatted = formatted.replace(pattern, target);
  }

  for (const [source, target] of MOJIBAKE_REPLACEMENTS) {
    formatted = formatted.replaceAll(source, target);
  }

  return formatted;
}
