import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppLayout } from "./components/layout/AppLayout";
import { DetailsPage } from "./pages/DetailsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { JobsPage } from "./pages/JobsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useCandidateStore } from "./store/useCandidateStore";

function AppRoutes() {
  const { isFormFilled, profile } = useCandidateStore();
  const hasFilled = Boolean(isFormFilled || (profile && profile.fullName));

  return (
    <Routes>
      {/* Root Route: If user already filled form, go straight to dashboard. Do not show filling form */}
      <Route
        path="/"
        element={
          hasFilled ? <Navigate to="/dashboard" replace /> : <DetailsPage />
        }
      />

      {/* Details / Change Profile: Always accessible */}
      <Route path="/details" element={<DetailsPage />} />

      {/* Protected Routes: accessible only when user has filled profile */}
      <Route
        path="/dashboard"
        element={
          hasFilled ? <DashboardPage /> : <Navigate to="/" replace />
        }
      />
      <Route
        path="/jobs"
        element={
          hasFilled ? <JobsPage /> : <Navigate to="/" replace />
        }
      />
      <Route
        path="/settings"
        element={
          hasFilled ? <SettingsPage /> : <Navigate to="/" replace />
        }
      />

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to={hasFilled ? "/dashboard" : "/"} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* Toast Notification Mount with dark glass styling */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
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
