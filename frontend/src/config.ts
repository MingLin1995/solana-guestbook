/**
 * API 基礎路徑設定
 * - 本地開發：為空字串，由 Vite Proxy 自動轉發至 http://localhost:8787
 * - 生產環境：優先讀取環境變數 VITE_API_URL，若未設定則自動回退至已部署的後端 Worker 網址
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://guestbook-worker.ben014335.workers.dev"
    : "");
