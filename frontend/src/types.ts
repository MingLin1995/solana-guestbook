export interface CheckInRecord {
  user_pubkey: string;
  message: string;
  timestamp: number;
  tx_signature: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
