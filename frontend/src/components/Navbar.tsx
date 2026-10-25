import { FC } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { BookOpen } from "lucide-react";

export const Navbar: FC = () => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 py-3 flex items-center justify-between">
        {/* Logo 區域 */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-solana-purple to-solana-green flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <BookOpen className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Solana Guestbook
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                Devnet
              </span>
            </div>
          </div>
        </div>

        {/* 錢包連接按鈕 */}
        <div className="flex items-center shrink-0">
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
};
