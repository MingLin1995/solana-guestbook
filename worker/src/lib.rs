use serde::{Deserialize, Serialize};
use worker::*;

mod db;
mod verify;

use db::{get_latest_checkins, upsert_checkin, CheckInRecord};
use verify::validate_checkin_payload;

/// 前端送來的簽到同步請求
#[derive(Deserialize)]
struct CheckInRequest {
    #[serde(rename = "txSignature")]
    tx_signature: String,
    #[serde(rename = "userPubkey")]
    user_pubkey: String,
    message: String,
    timestamp: Option<i64>,
}

/// 統一的 API 回應格式
#[derive(Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // 預檢請求 (CORS Preflight) 處理
    if req.method() == Method::Options {
        return Response::empty()?.with_cors(
            &Cors::default()
                .with_origins(vec!["*"])
                .with_methods(vec![Method::Get, Method::Post, Method::Options])
                .with_allowed_headers(vec!["Content-Type"]),
        );
    }

    let router = Router::new();

    let res = router
        // GET /api/checkins：讀取前 50 筆簽到記錄
        .get_async("/api/checkins", |_req, ctx| async move {
            let db = match ctx.env.d1("DB") {
                Ok(database) => database,
                Err(err) => {
                    return Response::from_json(&ApiResponse::<()> {
                        success: false,
                        data: None,
                        error: Some(format!("D1 資料庫連接失敗: {}", err)),
                    })
                    .map(|r| r.with_status(500));
                }
            };

            match get_latest_checkins(&db).await {
                Ok(checkins) => Response::from_json(&ApiResponse {
                    success: true,
                    data: Some(checkins),
                    error: None,
                }),
                Err(err) => Response::from_json(&ApiResponse::<()> {
                    success: false,
                    data: None,
                    error: Some(format!("讀取留言失敗: {}", err)),
                })
                .map(|r| r.with_status(500)),
            }
        })
        // POST /api/checkin：驗證前端資料並寫入資料庫
        .post_async("/api/checkin", |mut req, ctx| async move {
            let payload = match req.json::<CheckInRequest>().await {
                Ok(body) => body,
                Err(err) => {
                    return Response::from_json(&ApiResponse::<()> {
                        success: false,
                        data: None,
                        error: Some(format!("無效的請求資料格式: {}", err)),
                    })
                    .map(|r| r.with_status(400));
                }
            };

            // 格式與防禦校驗
            if let Err(err_msg) = validate_checkin_payload(
                &payload.user_pubkey,
                &payload.message,
                &payload.tx_signature,
            ) {
                return Response::from_json(&ApiResponse::<()> {
                    success: false,
                    data: None,
                    error: Some(err_msg.to_string()),
                })
                .map(|r| r.with_status(400));
            }

            let db = match ctx.env.d1("DB") {
                Ok(database) => database,
                Err(err) => {
                    return Response::from_json(&ApiResponse::<()> {
                        success: false,
                        data: None,
                        error: Some(format!("資料庫連接失敗: {}", err)),
                    })
                    .map(|r| r.with_status(500));
                }
            };

            let current_ts = payload
                .timestamp
                .unwrap_or_else(|| (Date::now().as_millis() / 1000) as i64);

            let record = CheckInRecord {
                user_pubkey: payload.user_pubkey,
                message: payload.message,
                timestamp: current_ts,
                tx_signature: payload.tx_signature,
            };

            match upsert_checkin(&db, &record).await {
                Ok(_) => Response::from_json(&ApiResponse {
                    success: true,
                    data: Some("簽到記錄已成功同步至邊緣快取"),
                    error: None,
                }),
                Err(err) => Response::from_json(&ApiResponse::<()> {
                    success: false,
                    data: None,
                    error: Some(format!("寫入資料庫失敗: {}", err)),
                })
                .map(|r| r.with_status(500)),
            }
        })
        .run(req, env)
        .await?;

    res.with_cors(
        &Cors::default()
            .with_origins(vec!["*"])
            .with_methods(vec![Method::Get, Method::Post, Method::Options])
            .with_allowed_headers(vec!["Content-Type"]),
    )
}
