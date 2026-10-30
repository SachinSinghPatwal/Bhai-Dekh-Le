import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppLayout } from "./components/layout/AppLayout";
import { DetailsPage } from "./pages/DetailsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { JobsPage } from "./pages/JobsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { useCandidateStore } from "./store/useCandidateStore";

function AppRoutes() {
  const { isFormFilled } = useCandidateStore();

  return (
    <Routes>
      <Route
        path="/"
        element={
          isFormFilled ? <Navigate to="/dashboard" replace /> : <DetailsPage />
        }
      />

      <Route
        path="/details"
        element={
          isFormFilled ? <Navigate to="/profile" replace /> : <DetailsPage />
        }
      />

      <Route
        path="/profile"
        element={
          isFormFilled ? <ProfilePage /> : <Navigate to="/" replace />
        }
      />

      <Route
        path="/dashboard"
        element={
          isFormFilled ? <DashboardPage /> : <Navigate to="/" replace />
        }
      />

      <Route
        path="/jobs"
        element={
          isFormFilled ? <JobsPage /> : <Navigate to="/" replace />
        }
      />

      <Route
        path="/settings"
        element={<Navigate to={isFormFilled ? "/profile" : "/"} replace />}
      />

      <Route
        path="*"
        element={<Navigate to={isFormFilled ? "/dashboard" : "/"} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgba(18, 18, 22, 0.92)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#f4f4f5",
            fontSize: "13px",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            padding: "12px 18px",
          },
        }}
      />

      <AppLayout>
        <AppRoutes />
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
