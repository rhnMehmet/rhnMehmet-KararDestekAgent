import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";

const initialForm = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await loginUser(form);
      navigate(response.user?.role === "admin" ? "/admin" : "/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Giriş sırasında bir hata oluştu."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">Giriş</span>
        <h1>Transfera hesabına bağlan.</h1>
        <p>
          Favorilerini yönetmek, yorum yazmak ve AI tahmin panelini görmek için
          giriş yap.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            placeholder="E-posta"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Şifre"
            value={form.password}
            onChange={handleChange}
            required
          />
          {error ? <div className="feedback error">{error}</div> : null}
          <button className="button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/register">Hesabın yok mu? Kayıt ol</Link>
        </div>
      </div>
    </main>
  );
}
