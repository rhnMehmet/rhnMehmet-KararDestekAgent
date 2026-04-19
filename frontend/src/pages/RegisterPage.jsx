import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/authService";

const initialForm = {
  name: "",
  surname: "",
  email: "",
  password: "",
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await registerUser(form);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Kayıt sırasında bir hata oluştu."
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
        <span className="eyebrow">Kayıt</span>
        <h1>Kendi transfer komuta merkezini aç.</h1>
        <p>
          Kullanıcı hesabını oluştur, favori oyuncu ve takımlarını ekleyip AI
          destekli akışı kullanmaya başla.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-grid">
            <input
              name="name"
              type="text"
              placeholder="Ad"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              name="surname"
              type="text"
              placeholder="Soyad"
              value={form.surname}
              onChange={handleChange}
              required
            />
          </div>
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
            {isSubmitting ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Zaten hesabın var mı? Giriş yap</Link>
        </div>
      </div>
    </main>
  );
}
