import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { storage } from "../services/api";
import { logoutUser } from "../services/authService";

const STARTER_PROMPTS = [
  "Arda Guler ile Kenan Yildiz karsilastir",
  "Real Madrid takim ozeti",
  "Serie A transfer trendi",
];

export default function AgentPage() {
  const navigate = useNavigate();
  const [profile] = useState(storage.getUser());
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Transfera Agent hazir. Futbolcu, takim, lig ve transfer sorularini sorabilirsin. Ornek: Arda Guler ile Kenan Yildiz karsilastir.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [relatedChunks, setRelatedChunks] = useState([]);

  const canSend = input.trim().length > 0 && !isSending;

  const historyPayload = useMemo(
    () =>
      messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages]
  );

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      window.location.replace("/login");
    }
  }

  async function sendMessage(rawMessage) {
    const trimmed = rawMessage.trim();

    if (!trimmed || isSending) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setFeedback("");
    setIsSending(true);

    try {
      const { data } = await api.post("/agent/chat", {
        message: trimmed,
        history: historyPayload,
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.answer || "Agent bir yanit uretemedi.",
        },
      ]);
      setRelatedChunks(Array.isArray(data.relatedChunks) ? data.relatedChunks : []);

      if (data.warning) {
        setFeedback(`Not: LM Studio yaniti alinamadi; yerel cevap kullanildi. (${data.warning})`);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            error.response?.data?.message ||
            error.message ||
            "Agent su anda cevap veremiyor.",
        },
      ]);
      setRelatedChunks([]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <main className="dashboard-page agent-page">
      <header className="dashboard-command-bar">
        <div className="dashboard-command-brand">
          <div className="dashboard-command-logo">T</div>
          <div className="dashboard-command-copy">
            <strong>Transfera</strong>
            <span>Football Market Analysis</span>
          </div>
        </div>

        <div className="dashboard-command-actions">
          <div className="dashboard-command-welcome">
            <span>Welcome</span>
            <strong>{profile?.name || "User"}</strong>
          </div>
          <button className="dashboard-command-button" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          <button className="dashboard-command-button dashboard-command-button-active">
            Agent
          </button>
          <button className="dashboard-command-button" onClick={() => navigate("/comments")}>
            Yorumlar
          </button>
          <button className="dashboard-command-button" onClick={() => navigate("/favorites")}>
            Favoriler
          </button>
          <button className="dashboard-command-button" onClick={() => navigate("/profile")}>
            Profil
          </button>
          {profile?.role === "admin" ? (
            <button className="dashboard-command-button" onClick={() => navigate("/admin")}>
              Admin
            </button>
          ) : null}
          <button className="dashboard-command-button dashboard-command-exit" onClick={handleLogout}>
            Cikis Yap
          </button>
        </div>
      </header>

      <section className="agent-shell">
        <section className="studio-panel agent-hero-panel">
          <div className="studio-section-head">
            <p className="eyebrow eyebrow-muted">Transfera Agent</p>
            <h1>Transfer ve performans analisti</h1>
            <p>
              Bu ekran sadece localde calisir. Agent; oyuncu karsilastirma, takim ozeti,
              lig trendi ve transfer yorumu gibi Transfera icine uygun cevaplar uretir.
            </p>
          </div>

          <div className="agent-starter-row">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="studio-chip"
                onClick={() => sendMessage(prompt)}
                disabled={isSending}
              >
                {prompt}
              </button>
            ))}
          </div>

          {feedback ? <div className="studio-feedback-banner">{feedback}</div> : null}
        </section>

        <section className="agent-layout">
          <section className="studio-panel agent-chat-panel">
            <div className="studio-section-head">
              <p className="eyebrow eyebrow-muted">Chat</p>
              <h2>Sorunu yaz</h2>
            </div>

            <div className="agent-message-list">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`agent-message-bubble agent-message-${message.role}`}
                >
                  <small>{message.role === "assistant" ? "Agent" : "Sen"}</small>
                  <p>{message.content}</p>
                </article>
              ))}
            </div>

            <form className="agent-compose" onSubmit={handleSubmit}>
              <textarea
                className="input agent-textarea"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ornek: Arda Guler ile Kenan Yildiz karsilastir"
                rows={4}
              />
              <button className="button-primary" type="submit" disabled={!canSend}>
                {isSending ? "Agent dusunuyor..." : "Soruyu Gonder"}
              </button>
            </form>
          </section>

          <aside className="studio-panel agent-context-panel">
            <div className="studio-section-head">
              <p className="eyebrow eyebrow-muted">Notlar</p>
              <h2>Kullanilan veri</h2>
              <p>Agent cevap uretirken oyuncu, takim, lig ve transfer bilgisini burada ozetler.</p>
            </div>

            <div className="agent-context-list">
              {relatedChunks.length ? (
                relatedChunks.map((chunk, index) => (
                  <article key={`${index}-${chunk.slice(0, 24)}`} className="agent-context-card">
                    <small>Parca {index + 1}</small>
                    <p>{chunk}</p>
                  </article>
                ))
              ) : (
                <div className="agent-context-card">
                  <small>Hazir</small>
                  <p>Oyuncu, takim veya lig ozeti burada gorunecek.</p>
                </div>
              )}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
