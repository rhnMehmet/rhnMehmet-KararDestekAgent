const axios = require("axios");

const LLM_BASE_URL = String(process.env.AGENT_LLM_BASE_URL || "").trim();
const LLM_API_KEY = String(process.env.AGENT_LLM_API_KEY || "").trim();
const LLM_MODEL = String(process.env.AGENT_MODEL || "").trim();

const client = axios.create({
  baseURL: LLM_BASE_URL,
  timeout: 120000,
  headers: LLM_API_KEY
    ? {
        Authorization: `Bearer ${LLM_API_KEY}`,
      }
    : {},
});

function isConfigured() {
  return Boolean(LLM_BASE_URL && LLM_MODEL);
}

function normalizeConversationHistory(history = []) {
  const normalized = [];

  for (const item of Array.isArray(history) ? history : []) {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = String(item?.content || "").trim();

    if (!role || !content) {
      continue;
    }

    if (!normalized.length && role !== "user") {
      continue;
    }

    const previous = normalized[normalized.length - 1];
    if (previous?.role === role) {
      continue;
    }

    normalized.push({ role, content });
  }

  if (normalized[normalized.length - 1]?.role === "user") {
    normalized.pop();
  }

  return normalized.slice(-6);
}

async function generateAgentAnswer({ message, history = [], draftAnswer, relatedChunks = [] }) {
  if (!isConfigured()) {
    return null;
  }

  const condensedHistory = normalizeConversationHistory(history);

  const contextBlock = [
    "Dogrulanmis veri ozeti:",
    draftAnswer || "-",
    "",
    "Ek baglam parcalari:",
    ...(relatedChunks.length ? relatedChunks.map((chunk) => `- ${chunk}`) : ["- yok"]),
  ].join("\n");

  const messages = [
    {
      role: "system",
      content: [
        "Sen Transfera Agent'sin.",
        "Kullanicinin sorusuna Turkce cevap ver.",
        "Sadece verilen dogrulanmis veri ve baglami kullan.",
        "Bilgi uydurma. Veri yetersizse bunu acikca soyle.",
        "Cevap net, dogal ve konuya dogrudan odakli olsun.",
      ].join(" "),
    },
    ...condensedHistory,
    {
      role: "system",
      content: contextBlock,
    },
    {
      role: "user",
      content: String(message || "").trim(),
    },
  ];

  const { data } = await client.post("/chat/completions", {
    model: LLM_MODEL,
    messages,
    temperature: 0.2,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LM Studio bos cevap dondurdu.");
  }

  return {
    answer: String(content).trim(),
    model: data?.model || LLM_MODEL,
  };
}

module.exports = {
  isConfigured,
  generateAgentAnswer,
};
