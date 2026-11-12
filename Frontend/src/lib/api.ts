export function getApiUrl(): string {
  const env = (import.meta as any).env;
  if (env?.VITE_BACKEND_URL) return String(env.VITE_BACKEND_URL);
  if (env?.VITE_API_URL) return String(env.VITE_API_URL);
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

