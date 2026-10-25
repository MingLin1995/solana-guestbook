import { FC, useEffect, useState } from "react";
import { CheckInRecord, ApiResponse } from "../types";
import { RefreshCw, ExternalLink, Clock, MessageSquare, Copy, Check } from "lucide-react";

interface Props {
  refreshTrigger: number;
}

export const GuestbookWall: FC<Props> = ({ refreshTrigger }) => {
  const [checkins, setCheckins] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchCheckins = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/checkins");
      const result: ApiResponse<CheckInRecord[]> = await res.json();
      if (result.success && result.data) {
        setCheckins(result.data);
      }
    } catch (err) {
      console.error("讀取留言牆失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckins();
  }, [refreshTrigger]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      {/* 標題與重新整理 */}
      <div className="flex items-center justify-between mb-3.5 h-8">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-solana-purple" />
          <h2 className="text-xl font-bold text-white">最新簽到</h2>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
            {checkins.length} 則留言
          </span>
        </div>
        <button
          onClick={fetchCheckins}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition border border-slate-700/60 disabled:opacity-50"
          title="刷新最新留言"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-3">
        {/* 載入中骨架 */}
        {loading && checkins.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-solana-purple" />
            <p className="text-sm">正在載入最新留言...</p>
          </div>
        ) : checkins.length === 0 ? (
          /* 空狀態提示 */
          <div className="py-14 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-solana-purple flex items-center justify-center mx-auto mb-3 border border-purple-500/20">
              <MessageSquare className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-slate-300 font-medium mb-1">目前還沒有人簽到</p>
            <p className="text-xs text-slate-500">
              連接你的 Phantom 或 Solflare 錢包，成為第一位鏈上記錄者！
            </p>
          </div>
        ) : (
          /* 留言卡片列表 */
          <div className="space-y-3">
            {checkins.map((record) => {
              const shortPubkey = `${record.user_pubkey.slice(0, 4)}...${record.user_pubkey.slice(-4)}`;
              return (
                <div
                  key={record.tx_signature}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm hover:border-slate-700/90 transition group"
                >
                  {/* 卡片頂部：用戶頭像、地址、時間戳與鏈上按鈕一體化 */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
                        {record.user_pubkey.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex items-center space-x-1.5 font-mono text-xs sm:text-sm text-slate-200 font-semibold truncate">
                        <span>{shortPubkey}</span>
                        <button
                          onClick={() => copyToClipboard(record.user_pubkey)}
                          className="text-slate-500 hover:text-slate-300 transition shrink-0"
                          title="複製完整公鑰"
                        >
                          {copiedKey === record.user_pubkey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-400 shrink-0">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatTimestamp(record.timestamp)}</span>
                      </div>
                      <span className="text-slate-700 hidden sm:inline">·</span>
                      <a
                        href={`https://explorer.solana.com/tx/${record.tx_signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-solana-green transition inline-flex items-center space-x-0.5"
                        title="在 Solana Explorer 查看交易"
                      >
                        <span>鏈上檢視</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    </div>
                  </div>

                  {/* 留言內容 */}
                  <p className="text-slate-100 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words pl-0.5">
                    {record.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
