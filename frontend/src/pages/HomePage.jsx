import { Link, Navigate } from "react-router-dom";
import { storage } from "../services/api";

export default function HomePage() {
  if (storage.getToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="landing-page">
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">TRANSFERA • AI TRANSFER INTELLIGENCE</span>
          <h1>Transfer piyasasını sadece takip etme, önden oku.</h1>
          <p>
            Premier League, La Liga, Bundesliga, Serie A ve Ligue 1 için oyuncu,
            takım, transfer ve değer tahminlerini tek panelde birleştiren akıllı
            futbol analitik platformu.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="button-primary">
              Hemen Başla
            </Link>
            <Link to="/login" className="button-secondary">
              Giriş Yap
            </Link>
          </div>
        </div>

        <div className="hero-board">
          <div className="metric-card">
            <span>Takip Edilen Lig</span>
            <strong>5 Büyük Lig</strong>
          </div>
          <div className="metric-card">
            <span>AI Modülleri</span>
            <strong>Değer + Transfer Tahmini</strong>
          </div>
          <div className="metric-card">
            <span>Canlı Veri</span>
            <strong>SportMonks Entegrasyonu</strong>
          </div>
        </div>
      </section>

      <section className="landing-grid">
        <article className="story-card">
          <span>Transfer Takibi</span>
          <h2>Bonservis, kulüp geçmişi ve hareket yönü tek ekranda.</h2>
          <p>
            Oyuncuların transfer geçmişi, hedef kulüpler ve son dönem hareketleri
            kullanıcı panelinde sürekli görünür kalır.
          </p>
        </article>

        <article className="story-card accent">
          <span>Piyasa Değeri</span>
          <h2>Performans ve yaş verisinden geleceğe dönük fiyat projeksiyonu.</h2>
          <p>
            Oyuncu değeri, form ve üretkenlik metrikleri ile birlikte okunur;
            trend raporu sayfadan ayrılmadan alınır.
          </p>
        </article>

        <article className="story-card">
          <span>Kullanıcı Deneyimi</span>
          <h2>Favori takım, favori oyuncu ve yorum akışıyla kişisel analiz alanı.</h2>
          <p>
            Giriş yapan kullanıcılar kendi listelerini yönetebilir ve oyuncular
            hakkında yorum bırakabilir.
          </p>
        </article>
      </section>
    </main>
  );
}
