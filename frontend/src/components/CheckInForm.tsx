import { FC, useState } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { SystemProgram } from "@solana/web3.js";
import { getGuestbookProgram, findCheckInPda } from "../utils/anchor";
import { API_BASE_URL } from "../config";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  onCheckInSuccess: () => void;
}

export const CheckInForm: FC<Props> = ({ onCheckInSuccess }) => {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorWallet) return;
    if (!message.trim()) {
      setErrorMsg("留言內容不能為空");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setLastTx(null);

      // 步驟 1：建立 Anchor 程式實例與計算 PDA
      setStatusMsg("準備簽到交易...");
      const program = getGuestbookProgram(connection, anchorWallet);
      const [checkInPda] = findCheckInPda(anchorWallet.publicKey);

      // 步驟 2：構建並發送 Solana 鏈上交易
      setStatusMsg("請在錢包中確認並簽署交易...");
      const txSignature = await program.methods
        .initializeOrUpdateCheckin(message)
        .accounts({
          checkInAccount: checkInPda,
          user: anchorWallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setLastTx(txSignature);

      // 步驟 3：通知後端同步資料
      setStatusMsg("交易已上鏈！正在更新簽到牆...");
      const res = await fetch(`${API_BASE_URL}/api/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPubkey: anchorWallet.publicKey.toBase58(),
          message,
          txSignature,
        }),
      });

      const result = await res.json().catch(() => ({
        success: false,
        error: "無法解析後端回應",
      }));
      if (!result.success) {
        throw new Error(result.error || "簽到牆同步失敗");
      }

      setStatusMsg("簽到成功！");
      setMessage("");
      onCheckInSuccess();
    } catch (err: any) {
      console.error("簽到失敗:", err);
      setStatusMsg("");
      setErrorMsg(err.message || "簽到交易失敗，請檢查 Devnet 餘額或重試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 標題欄 */}
      <div className="flex items-center justify-between mb-3.5 h-8">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-solana-green mr-2"></span>
          寫下留言
        </h2>
        <span className="text-xs text-slate-400">
          上限 280 字元 ({message.length}/280)
        </span>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        {!anchorWallet ? (
          <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-6">
            <p className="text-slate-400 mb-2">請先於右上角連接你的 Phantom 或 Solflare 錢包</p>
            <p className="text-xs text-slate-500">
              (需切換至 Solana Devnet 測試網，並持有少量測試 SOL)
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder="留下你想對全世界說的話（此留言將永久儲存於 Solana 鏈上與全球邊緣資料庫）..."
                disabled={loading}
                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl p-3.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-solana-purple focus:ring-1 focus:ring-solana-purple transition resize-none text-sm leading-relaxed"
              />
            </div>

            {/* 狀態提示 */}
            {statusMsg && (
              <div className="flex items-center text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-lg">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2 shrink-0 text-solana-green" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2 shrink-0 text-emerald-400" />
                )}
                <span>{statusMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-lg">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {lastTx && (
              <div className="text-xs text-slate-400">
                鏈上交易憑證：
                <a
                  href={`https://explorer.solana.com/tx/${lastTx}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-solana-green hover:underline ml-1 font-mono break-all"
                >
                  {lastTx.slice(0, 16)}...{lastTx.slice(-16)} ↗
                </a>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-solana-purple to-solana-green text-black hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-purple-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    發送簽到中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    送出鏈上簽到
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
