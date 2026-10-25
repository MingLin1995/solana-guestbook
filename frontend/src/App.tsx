import { FC, useState } from "react";
import { WalletContextProvider } from "./components/WalletContextProvider";
import { Navbar } from "./components/Navbar";
import { CheckInForm } from "./components/CheckInForm";
import { GuestbookWall } from "./components/GuestbookWall";
import { PROGRAM_ID } from "./utils/anchor";
import { ExternalLink } from "lucide-react";

export const AppContent: FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCheckInSuccess = () => {
    // 簽到成功後刷新留言牆
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Hero 標題區 */}
        <section className="mb-10 text-center max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-solana-purple via-indigo-400 to-solana-green bg-clip-text text-transparent">
              Solana Guestbook
            </span>
            <br />
            鏈上簽到牆
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            連接你的 Solana 錢包，在區塊鏈上留下專屬於你的永久印記。
          </p>
        </section>

        {/* 核心工作區 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 左欄：簽到表單 (佔 5 欄) */}
          <div className="lg:col-span-5">
            <CheckInForm onCheckInSuccess={handleCheckInSuccess} />
          </div>

          {/* 右欄：即時留言牆列表 (佔 7 欄) */}
          <div className="lg:col-span-7">
            <GuestbookWall refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="border-t border-slate-800/60 bg-slate-950/40 py-8 text-center text-xs text-slate-500 space-y-2">
        <p>Solana Guestbook · 運行於 Solana Devnet</p>
        <p className="flex items-center justify-center space-x-1">
          <span>合約地址：</span>
          <a
            href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-solana-green underline underline-offset-2 inline-flex items-center"
          >
            <span className="font-mono">{PROGRAM_ID.toBase58().slice(0, 6)}...{PROGRAM_ID.toBase58().slice(-6)}</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </p>
      </footer>
    </div>
  );
};

export const App: FC = () => {
  return (
    <WalletContextProvider>
      <AppContent />
    </WalletContextProvider>
  );
};

export default App;
