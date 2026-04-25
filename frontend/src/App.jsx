import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SiteFooter from "./components/SiteFooter";
import { storage } from "./services/api";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const PlayerDetailPage = lazy(() => import("./pages/PlayerDetailPage"));
const LeaguePage = lazy(() => import("./pages/LeaguePage"));
const TeamDetailPage = lazy(() => import("./pages/TeamDetailPage"));
const FavoritePlayersPage = lazy(() => import("./pages/FavoritePlayersPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminUserPage = lazy(() => import("./pages/AdminUserPage"));
const CommentsCommunityPage = lazy(() => import("./pages/CommentsCommunityPage"));
const AgentPage = lazy(() => import("./pages/AgentPage"));

function getDefaultRoute() {
  const currentUser = storage.getUser();
  return currentUser?.role === "admin" ? "/admin" : "/dashboard";
}

function ProtectedRoute({ children }) {
  return storage.getToken() ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  if (!storage.getToken()) {
    return <Navigate to="/login" replace />;
  }

  return storage.getUser()?.role === "admin" ? (
    children
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <div className="app-content">
        <Suspense
          fallback={
            <main className="dashboard-page">
              <div className="panel">
                <p>Yukleniyor...</p>
              </div>
            </main>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                storage.getToken() ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />
              }
            />
            <Route
              path="/login"
              element={
                storage.getToken() ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />
              }
            />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users/:userId"
              element={
                <AdminRoute>
                  <AdminUserPage />
                </AdminRoute>
              }
            />
            <Route
              path="/players/:playerId"
              element={
                <ProtectedRoute>
                  <PlayerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:leagueSlug"
              element={
                <ProtectedRoute>
                  <LeaguePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams/:teamId"
              element={
                <ProtectedRoute>
                  <TeamDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites/players"
              element={
                <ProtectedRoute>
                  <FavoritePlayersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comments"
              element={
                <ProtectedRoute>
                  <CommentsCommunityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent"
              element={
                <ProtectedRoute>
                  <AgentPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </div>

      <SiteFooter />
    </div>
  );
}
