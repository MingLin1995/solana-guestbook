/**
 * API 基礎路徑設定
 * - 本地開發：未設定 VITE_API_URL 時為空字串，由 Vite Proxy 轉發至 http://localhost:8787
 * - 生產環境：設定為 Cloudflare Worker 完整網址 (如 https://guestbook-worker.xxx.workers.dev)
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "";
