use serde::{Deserialize, Serialize};
use worker::{d1::D1Database, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckInRecord {
    pub user_pubkey: String,
    pub message: String,
    pub timestamp: i64,
    pub tx_signature: String,
}

/// 讀取最新 50 筆簽到記錄
pub async fn get_latest_checkins(db: &D1Database) -> Result<Vec<CheckInRecord>> {
    let query = "SELECT user_pubkey, message, timestamp, tx_signature FROM checkins ORDER BY timestamp DESC LIMIT 50";
    let statement = db.prepare(query);
    let result = statement.all().await?;
    let records = result.results::<CheckInRecord>()?;
    Ok(records)
}

/// 寫入或更新簽到記錄（以 user_pubkey 作為 Primary Key 進行 UPSERT）
pub async fn upsert_checkin(db: &D1Database, record: &CheckInRecord) -> Result<()> {
    let query = "INSERT INTO checkins (user_pubkey, message, timestamp, tx_signature) \
                 VALUES (?1, ?2, ?3, ?4) \
                 ON CONFLICT(user_pubkey) DO UPDATE SET \
                 message = excluded.message, \
                 timestamp = excluded.timestamp, \
                 tx_signature = excluded.tx_signature";

    let statement = db.prepare(query);
    let bound = statement.bind(&[
        record.user_pubkey.clone().into(),
        record.message.clone().into(),
        (record.timestamp as f64).into(),
        record.tx_signature.clone().into(),
    ])?;

    bound.run().await?;
    Ok(())
}
