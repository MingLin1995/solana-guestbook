import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import idl from "../idl.json";

// 鏈上合約地址 (Devnet)
export const PROGRAM_ID = new PublicKey(
  (idl as any).address ||
    (idl as any).metadata?.address ||
    "EKR4NkE7RYZiLynvP4LWEq6UNcbfKnKiJkq72ciwxoSm"
);

/**
 * 依據種子 [b"checkin", user_pubkey] 計算用戶專屬的 PDA 地址
 */
export function findCheckInPda(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("checkin"), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * 取得 Anchor Program 實例
 */
export function getGuestbookProgram(
  connection: Connection,
  wallet: AnchorWallet
): Program {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );
  // 確保傳入 Anchor 的 IDL 具備根層級 address (符合 Anchor 0.30+ 規格)
  const idlWithAddress = {
    ...idl,
    address: (idl as any).address || PROGRAM_ID.toBase58(),
  };
  return new Program(idlWithAddress as any, provider);
}
