import api, { normalizeStoredUser, storage } from "./api";

export async function registerUser(payload) {
  const { data } = await api.post("/users/register", payload);
  const normalizedUser = normalizeStoredUser(data.user);
  storage.setToken(data.token);
  storage.setUser(normalizedUser);
  return {
    ...data,
    user: normalizedUser,
  };
}

export async function loginUser(payload) {
  const { data } = await api.post("/users/login", payload);
  const normalizedUser = normalizeStoredUser(data.user);
  storage.setToken(data.token);
  storage.setUser(normalizedUser);
  return {
    ...data,
    user: normalizedUser,
  };
}

export async function getProfile(userId) {
  const { data } = await api.get(`/users/${userId}`);
  if (data.user) {
    const normalizedUser = normalizeStoredUser(data.user);
    storage.setUser(normalizedUser);
    return normalizedUser;
  }
  return null;
}

export async function logoutUser() {
  try {
    await api.post("/users/logout");
  } catch {
    // Arayüzde yönlendirme takılmasın diye yerel çıkışa devam et.
  } finally {
    storage.clearToken();
    storage.clearUser();
  }
}
