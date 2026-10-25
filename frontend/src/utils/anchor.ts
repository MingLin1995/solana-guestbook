import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import idl from "../idl.json";

// 鏈上合約地址 (Devnet)
export const PROGRAM_ID = new PublicKey(
  idl.metadata?.address || "EKR4NkE7RYZiLynvP4LWEq6UNcbfKnKiJkq72ciwxoSm"
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
  return new Program(idl as any, provider);
}
