import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppLayout } from "./components/layout/AppLayout";
import { DetailsPage } from "./pages/DetailsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { JobsPage } from "./pages/JobsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { useCandidateStore } from "./store/useCandidateStore";
import { useJobStore } from "./store/useJobStore";

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
        path="*"
        element={<Navigate to={isFormFilled ? "/dashboard" : "/"} replace />}
      />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    const { hydrateFromBackend } = useCandidateStore.getState();
    const { flushPendingApplied, fetchMatchedJobs } = useJobStore.getState();

    const initializeAppState = async () => {
      await hydrateFromBackend();
      await flushPendingApplied();
      await fetchMatchedJobs();
    };

    void initializeAppState();

    const handleBeforeExit = () => {
      void useJobStore.getState().flushPendingApplied({ keepalive: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleBeforeExit();
      }
    };

    window.addEventListener("beforeunload", handleBeforeExit);
    window.addEventListener("pagehide", handleBeforeExit);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeExit);
      window.removeEventListener("pagehide", handleBeforeExit);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
