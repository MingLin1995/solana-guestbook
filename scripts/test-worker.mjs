import { spawn } from "node:child_process";
import path from "node:path";

const TEST_PORT = 8788;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// 顏色輸出工具
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;

console.log(
  bold("\n開始執行 Cloudflare Worker (Rust/Wasm) 邊緣後端自動化測試...\n"),
);

// 1. 啟動測試用 Wrangler 伺服器
const cargoPath = `${process.env.HOME}/.cargo/bin`;
const env = {
  ...process.env,
  PATH: `${cargoPath}:${process.env.PATH}`,
};

const wranglerBin = path.resolve("node_modules/.bin/wrangler");
const server = spawn(wranglerBin, ["dev", "--port", String(TEST_PORT)], {
  cwd: "worker",
  env,
  stdio: "pipe",
});

let serverOutput = "";
server.stdout.on("data", (data) => (serverOutput += data.toString()));
server.stderr.on("data", (data) => (serverOutput += data.toString()));

// 等待伺服器就緒
async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/checkins`);
      if (res.status === 200) return true;
    } catch {
      // 伺服器尚未就緒，等待 500ms 重試
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("伺服器啟動超時！日誌：\n" + serverOutput);
}

// 測試案例統計
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ${green("✔")} ${message}`);
    passed++;
  } else {
    console.error(`  ${red("✖")} ${message}`);
    failed++;
  }
}

async function runTests() {
  try {
    process.stdout.write("正在啟動邊緣後端測試伺服器...");
    await waitForServer();
    console.log(` ${green("已就緒！")}\n`);

    // ---------------------------------------------------------
    // 測試案例 1：讀取初始留言列表
    // ---------------------------------------------------------
    console.log(cyan("▶ 測試模組 1：GET /api/checkins 讀取 API"));
    const getRes = await fetch(`${BASE_URL}/api/checkins`);
    assert(getRes.status === 200, "HTTP 狀態碼應為 200");
    const getData = await getRes.json();
    assert(getData.success === true, "回應體 success 應為 true");
    assert(Array.isArray(getData.data), "data 應為陣列格式");

    // ---------------------------------------------------------
    // 測試案例 2：輸入防禦校驗（空留言、非法 Base58 公鑰）
    // ---------------------------------------------------------
    console.log(cyan("\n▶ 測試模組 2：POST /api/checkin 資料驗證與防禦校驗"));
    const badRes1 = await fetch(`${BASE_URL}/api/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPubkey: "InvalidPubkey!",
        message: "Hello",
        txSignature: "InvalidSig",
      }),
    });
    assert(badRes1.status === 400, "傳入非法公鑰應回傳 400 Bad Request");

    const badRes2 = await fetch(`${BASE_URL}/api/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPubkey: "EKR4NkE7RYZiLynvP4LWEq6UNcbfKnKiJkq72ciwxoSm",
        message: "   ",
        txSignature:
          "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYj7WNXTHQXUrJhUCP5vwWcxWDN45x1T8YshbWwM5jP5ZJb25i58tA",
      }),
    });
    assert(badRes2.status === 400, "傳入空白留言應回傳 400 Bad Request");

    // ---------------------------------------------------------
    // 測試案例 3：正常寫入簽到記錄
    // ---------------------------------------------------------
    console.log(
      cyan("\n▶ 測試模組 3：POST /api/checkin 正常寫入與 D1 快取更新"),
    );
    const testUser = "EKR4NkE7RYZiLynvP4LWEq6UNcbfKnKiJkq72ciwxoSm";
    const postRes1 = await fetch(`${BASE_URL}/api/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPubkey: testUser,
        message: "單元測試：第一筆邊緣簽到",
        txSignature:
          "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYj7WNXTHQXUrJhUCP5vwWcxWDN45x1T8YshbWwM5jP5ZJb25i58tA",
      }),
    });
    assert(postRes1.status === 200, "成功寫入應回傳 200 OK");
    const postData1 = await postRes1.json();
    assert(postData1.success === true, "回應體 success 應為 true");

    // ---------------------------------------------------------
    // 測試案例 4：一人一 PDA 無鎖更新 (UPSERT 冪等性驗證)
    // ---------------------------------------------------------
    console.log(cyan("\n▶ 測試模組 4：UPSERT 更新測試 (同一用戶更新留言)"));
    const postRes2 = await fetch(`${BASE_URL}/api/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPubkey: testUser,
        message: "單元測試：更新後的邊緣簽到",
        txSignature:
          "4VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYj7WNXTHQXUrJhUCP5vwWcxWDN45x1T8YshbWwM5jP5ZJb25i58tB",
      }),
    });
    assert(postRes2.status === 200, "二次簽到更新應回傳 200 OK");

    const getResFinal = await fetch(`${BASE_URL}/api/checkins`);
    const finalData = await getResFinal.json();
    const userRecords = finalData.data.filter(
      (r) => r.user_pubkey === testUser,
    );
    assert(
      userRecords.length === 1,
      "同一用戶在 D1 中應永遠保持唯一記錄 (無重複)",
    );
    assert(
      userRecords[0].message === "單元測試：更新後的邊緣簽到",
      "記錄內容應成功被最新留言覆蓋更新",
    );
  } catch (err) {
    console.error(red("\n測試執行遭遇異常:"), err);
    failed++;
  } finally {
    // 關閉測試伺服器
    server.kill("SIGKILL");
    console.log(
      bold(
        `\n測試結果匯總: ${green(`${passed} 通過`)}, ${failed > 0 ? red(`${failed} 失敗`) : "0 失敗"}\n`,
      ),
    );
    if (failed > 0) process.exit(1);
    process.exit(0);
  }
}

runTests();
