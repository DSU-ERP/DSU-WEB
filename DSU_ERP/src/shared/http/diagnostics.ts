import "server-only";
import { CampusError } from "./errors";

export type Failure = { message: string; hint?: string };

// Turns a backend failure into a specific explanation. Operator hints (which
// command to run) are shown only in development, never to production users.
export function describeFailure(error: unknown): Failure {
  const code = error instanceof CampusError ? error.code : undefined;
  const backend = process.env.DSU_BACKEND_URL || "DSU_BACKEND_URL (not set)";
  const dev = process.env.NODE_ENV !== "production";
  const failures: Record<string, Failure> = {
    DATABASE_UPDATE_PENDING: {
      message: "The campus database update is pending. Please try again once it has been applied.",
      hint: "In DSU-Backend run: npm run db:status, then npm run db:migrate, then restart the backend.",
    },
    BACKEND_UNREACHABLE: {
      message: "Campus services are not reachable right now. Please try again shortly.",
      hint: `Nothing answered at ${backend}. Start the backend: cd DSU-Backend && npm run dev`,
    },
    BACKEND_TIMEOUT: {
      message: "Campus services took too long to respond. Please try again shortly.",
      hint: `The backend at ${backend} did not answer in time. Check its console for database or network errors.`,
    },
    BACKEND_OUTDATED: {
      message: "Campus services are being updated. Please try again shortly.",
      hint: "The running backend does not have the routes this website needs. Restart it so it loads the latest code (npm run dev reloads automatically).",
    },
    BACKEND_NOT_CONFIGURED: {
      message: "Campus services have not been configured correctly.",
      hint: "Set DSU_BACKEND_URL in DSU_ERP/.env.local (for example http://127.0.0.1:4000) and restart the web server.",
    },
    BACKEND_INVALID_RESPONSE: {
      message: "Campus services returned an unexpected response. Please try again shortly.",
      hint: `${backend} did not return JSON. Check that DSU_BACKEND_URL points at DSU-Backend, not at the website.`,
    },
    AUTH_UNAVAILABLE: {
      message: "Sign-in verification is temporarily unavailable. Please try again shortly.",
      hint: "The backend could not reach Supabase Auth to verify your session. Check SUPABASE_URL in DSU-Backend/.env and your network.",
    },
    SERVICE_UNAVAILABLE: {
      message: "Campus services are temporarily unavailable. Please try again shortly.",
      hint: "The backend hit an internal error. Its console shows a request_failed line with the request id and error code.",
    },
  };
  const known = code ? failures[code] : undefined;
  if (known) return dev ? known : { message: known.message };
  return {
    message:
      error instanceof CampusError
        ? error.message
        : "Campus services are temporarily unavailable. Please try again shortly.",
  };
}
