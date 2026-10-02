# EcoScan AI — 專案開發計劃

> 依據：《作品暫定計劃書.pdf》、AGENTS.md、官方比賽章程與 DeepSeek API 官方文件查證。
> 查證日期：2026-10-02。本計劃為內部工作文件（中文）；所有對外交付材料一律英文。

---

## 一、現況與時程現實

- **今天：2026-10-02（五）。截止：2026-10-09。剩 7 個工作天 + 1 天 buffer。**
- 本地資料夾現況：`AGENTS.md`（已就緒）、`README.md`（空白）、計劃書 PDF；**尚未 git init、尚未連接 GitHub repo `Anormalguybr/what`**。
- 比賽時程（官方章程已核實）：
  - 10/09 交件截止（逾期不受理）
  - 10/10–10/30 初步評審（網上）
  - 11/01–11/15 複評／準決賽（英文線上答辯）
  - 11/26 全球決賽（澳門線下，三人須全部參與答辯）

---

## 二、關鍵查證結果（2026-10-02，官方來源）

### 2.1 DeepSeek API — AGENTS.md 第四節 7 項查證

| # | 查證項目 | 結果 |
| --- | --- | --- |
| 1 | 供應商 | DeepSeek, Inc. |
| 2 | 官方 endpoint | `https://api.deepseek.com`（OpenAI 相容）；`https://api.deepseek.com/anthropic`（Anthropic 相容） |
| 3 | 模型 ID | `deepseek-flash`（= DeepSeek-V4.1-Flash）；`deepseek-v4-pro`（= DeepSeek-V4-Pro-0813） |
| 4 | **圖片輸入** | **`deepseek-flash` 支援（Vision ✓）；`deepseek-v4-pro` 不支援（✗）** |
| 5 | SDK 支援 | 官方支援 OpenAI SDK（`npm install openai`，設定 `baseURL` 即可） |
| 6 | 請求格式與限制 | 見下表 |
| 7 | 金鑰設定 | platform.deepseek.com 申請；只放後端 `.env`（`DEEPSEEK_API_KEY`） |

**圖片輸入細節（`deepseek-flash`）：**

| 項目 | 限制 |
| --- | --- |
| 支援格式 | JPEG、PNG、GIF、WebP（依檔案內容偵測，非副檔名） |
| 傳送方式 | base64 data URL（最簡單）、外部 URL、Files API |
| 請求體上限 | 48 MiB |
| 單圖上限 | 32 MiB（base64／URL） |
| 圖片尺寸 | 最大 8192 px／邊；每圖最多約 1024 tokens |
| 圖片位置 | 只能放 `user` message（system／assistant 會回 400） |

**JSON Output（固定回應格式的關鍵）：**
- `response_format: {'type': 'json_object'}` + prompt 內含 "json" 字樣與範例 JSON。
- `max_tokens` 要設合理值，避免 JSON 被截斷。
- ⚠️ 官方注明偶發空內容回應 → 後端必須 retry 一次 + 錯誤處理。

**速率與價格：**
- 並發上限：帳戶級 2500（flash）；超過回 HTTP 429。
- 價格（flash）：輸入 $0.15–0.30／1M tokens、輸出 $0.6–1.2／1M tokens；一張圖約 1024 tokens → **測試 100 次遠低於 1 美元**，預算無壓力。
- Thinking mode 預設開啟；追求 1–2 秒回應可評估關閉（`thinking: {type: "disabled"}`）。
- 非串流請求會持續回傳空行（keep-alive），10 分鐘未開始推理會斷線。

**結論：單一模型 `deepseek-flash` 即可完成「圖片辨識 + 英文分類理由 + 清理指引 + 學習知識」，無需 Gemini/OpenAI 備援，無需自訓模型。**

**待實作時補核實（隊員 B）：**
- Error codes 頁：<https://api-docs.deepseek.com/quick_start/error_codes>
- API key 實際有效性和餘額（Day 1 晚上用 curl 驗證）

### 2.2 比賽章程 — 官方網頁已核實

- **2026 主題：「AI and Education: AI Transforming the Educational Paradigm and Enhancing AI Literacy」，作品須以教育情境為核心。**
- 組別：AI for Social Innovation（EcoScan AI 定位：教學生垃圾分類的 AI 學習工具 + SDG 12/13）。
- 評審比重（策略依據）：

| 範疇 | 比重 | EcoScan AI 對應策略 |
| --- | --- | --- |
| AI 技術運用 | 25% | 真 DeepSeek Vision 呼叫、固定 JSON contract、Prompt 設計完整揭露 |
| 問題與教育價值 | 20% | 澳門學生分類困難 + 教育用途（理由、知識、小測驗）+ SDG |
| 原型測試成效 | 20% | 可操作原型 + 3–5 人小規模測試 + 記錄表 |
| 創意原創性 | 20% | 澳門本地回收規則 + 即拍即學 |
| 英文表達 | 10% | 全英文介面 + 英文材料 + 英文答辯練習 |
| 倫理安全私隱 | 5% | 不存圖片、匿名測試、AI 使用揭露 |

- 交件規格：Intro ≤2 頁、Report 6–12 頁、海報 0.8 m × 1.1 m 英文直向、Demo Video ≤5 分鐘英文旁白、作品相片；全部 PDF ≤50 MB；影片連結可。
- 檔名規則：`ProjectIntroduction_EcoScanAI.pdf`、`ResearchReport_EcoScanAI.pdf`、`Poster_EcoScanAI.pdf`、`DemoVideo_EcoScanAI.mp4`。
- 報名：<https://form.mcs.mo/forms/global-youth-ai-competition-pqnoz0>
- AI 使用必須在 Research Report 揭露（工具名稱、版本、用途、學生完成部分）。
- 決賽需離線備援（影片 + 截圖 + 備用示範）。

---

## 三、計劃書（PDF）與 AGENTS.md 差異裁決

| 項目 | PDF 計劃書 | AGENTS.md（優先） | 最終決定 |
| --- | --- | --- | --- |
| 前端 | Streamlit 或 HTML5/JS | React + JavaScript + Vite | **React + Vite** |
| 視覺模型 | Teachable Machine / Roboflow 自訓模型 | 真實 AI、不得固定規則假冒 | **`deepseek-flash` API 直接辨識**（7 天內自訓模型風險過高，且 API 已核實支援視覺） |
| 文字生成 | Gemini / OpenAI API | DeepSeek 為主 | **`deepseek-flash` 單模型**（已核實支援圖片） |
| 減碳數字 | 顯示節能減碳效益 | 無可靠來源不顯示 | **learningFact 須附來源；無來源的碳／能源數字一律不顯示** |
| 部署 | Streamlit Cloud / Vercel | 金鑰只能在後端環境變數 | 前端 **Vercel** + 後端 **Render**（免費層） |
| 回應格式 | 未規範 | 固定 JSON 欄位 | AGENTS.md JSON contract + DeepSeek JSON Output |

---

## 四、目標系統架構

```text
[手機／電腦瀏覽器]
  React + Vite（響應式、英文介面）
  相機拍照（getUserMedia，需 HTTPS）／圖片上傳 → 預覽 → 確認送出
        │  POST /api/classify（multipart/form-data 或 base64 JSON）
        ▼
[Node.js + Express 後端（Render，金鑰只在 .env）]
  驗證：檔案類型（JPEG/PNG/WebP）、大小上限（建議 10 MB）、請求格式
  錯誤處理：400 / 413 / 429 / 502 / 504 → 固定英文錯誤 JSON
  不保存圖片：記憶體處理完成即丟棄
        │  base64 data URL + system prompt（含 JSON 範例）
        ▼
[DeepSeek `deepseek-flash`（Vision + JSON Output）]
        │  固定 JSON 回應
        ▼
[前端結果頁]
  itemName / category / recyclable / confidence（低信心提示）
  reason / cleaningSteps / learningFact / safetyNote / sourceNeeded
  + 1 題英文小測驗（答案 + 解釋）+ 學習回饋
  + 「請確認當地規則」提示（不確定項目）
```

- CORS：白名單（localhost + Vercel 網域）。
- HTTPS：Vercel/Render 自帶；相機權限必須 HTTPS。
- 回應欄位完全遵循 AGENTS.md 第三節 JSON contract；無法可靠判斷時回 `unknown`，不猜測。

---

## 五、三人分工（依 AGENTS.md 第九節）

| 角色 | 分支 | 負責 |
| --- | --- | --- |
| A：前端 | `feature/frontend-upload` | React 頁面、相機／上傳、預覽、結果頁、載入／錯誤狀態、響應式、小測驗 UI |
| B：後端和 AI | `feature/backend-ai` | Express API、DeepSeek 整合、Prompt、JSON 驗證、環境變數、錯誤處理、部署 Render |
| C：資料、教育、文件 | `feature/data-docs` | 澳門分類來源、learningFact／quiz 題庫、測試圖片與測試表、README、研究報告、AI 揭露、poster、影片 script |

---

## 六、七日衝刺時程（10/02 → 10/08，10/09 為緊急 buffer）

### D1｜10/02（五）今晚 — 建置與驗證

- 全員（30 分鐘 kick-off）：git init、推送 GitHub `main`、各自開功能分支（見第八節指令）。
- B：Express 骨架、`/api/classify` 先回 mock JSON、`.env.example`、`.gitignore`。
- A：`npm create vite@latest` React scaffold、首頁（英文標題＋用途說明）、上傳＋拍照輸入、預覽。
- C：澳門回收分類資料來源調研（澳門環境保護局、清潔專營有限公司等官方管道）→ `docs/data-sources.md` 初稿。
- **M1：repo 可 build、前後端本地可 run。**
- **B 今晚必做：curl 實測 DeepSeek key（見第九節）。**

### D2｜10/03（六）— 真 AI 接通

- B：DeepSeek 整合（base64 圖 + JSON Output + prompt）、檔案驗證、錯誤處理、逾時。
- A：結果頁完整 UI（所有 JSON 欄位）、loading／error／unknown 狀態。
- C：分類對照資料表、learningFact 與 quiz 題庫（每條附來源）。
- **M2：`POST /api/classify` 回傳真實 AI 的合法 JSON。**

### D3｜10/04（日）— 端到端聯調

- A + B 聯調：拍照 → 後端 → 結果頁全流程；手機瀏覽器實測。
- A：響應式調整、相機權限拒絕處理（提示改用上傳）。
- B：邊界情況（大圖、錯格式、429、逾時、空 JSON retry）。
- C：Project Introduction 英文草稿、Research Report 英文大綱。
- **M3：真 AI 端到端完成（桌面＋手機）。**

### D4｜10/05（一）— 教育功能與測試

- A：小測驗 UI（作答 → 正確答案 → 解釋）、學習回饋、低信心提示。
- B：Prompt 調優（分類準確度、誠實回報 unknown）。
- C：準備匿名測試圖片組（8–10 張）＋測試記錄表。
- 全員晚上：**小規模測試 3–5 位同學／老師**，如實記錄（不得捏造；做不到就標「待完成」）。
- **M4：教育功能上線＋測試數據（真實記錄）。**

### D5｜10/06（二）— 部署與文件

- B：後端部署 Render（環境變數設定）、CORS 白名單。
- A：前端部署 Vercel、連接 API、手機實測公開網址。
- C：Research Report 完稿、README、`docs/architecture.md`、`docs/testing.md`、`docs/ai-disclosure.md`、`docs/data-sources.md` 完稿。
- 離線備援準備：關鍵頁面截圖、預錄測試結果。
- **M5：公開 HTTPS 網址可用（相機可開）。**

### D6｜10/07（三）— 交件材料

- 錄 Demo Video（≤5 分鐘、英文旁白，展示真實流程＋AI 角色＋備援說明）。
- Poster 完稿（0.8 m × 1.1 m 英文直向，可獨立解釋作品）。
- Project Introduction（≤2 頁）與 Research Report（6–12 頁）轉 PDF。
- 全員：AGENTS.md 第十四節品質門檻 checklist 全跑一遍。
- **M6：四項交件材料齊備。**

### D7｜10/08（四）— 提交

- 最終檢查（檔名規則、檔案大小、連結有效）。
- 提交報名系統：<https://form.mcs.mo/forms/global-youth-ai-competition-pqnoz0>
- **M7：已提交（留 10/09 作緊急修正 buffer）。**

---

## 七、範圍控制（MVP）

**做**：單一分類流程（拍照／上傳 → 結果）、1 題英文小測驗、低信心／未知處理、3–5 人測試、部署、四項英文材料。

**不做（明確排除）**：帳號系統、歷史紀錄、多語言、自訓模型、社群分享、離線 App。理由：7 天時程；比賽重點是「可操作原型＋學生能解釋」。

---

## 八、Day 1 Git 快速上手（新手版，每人照做）

```bash
# 1. 進入專案資料夾
cd ICT_RACE_THING_2627

# 2. 初始化 repo（只做一次，由一人執行）
git init
git branch -M main

# 3. 連接 GitHub 遠端（由一人執行；repo 需先在 GitHub 建立/確認）
git remote add origin https://github.com/Anormalguybr/what.git

# 4. 先提交現有的 AGENTS.md 和計劃書
git add AGENTS.md README.md
git commit -m "docs: add project instructions and initial plan"
git push -u origin main

# 5. 每人開自己的功能分支（不要直接改 main）
git checkout main
git pull origin main
git checkout -b feature/frontend-upload   # A 用這個
# B 用 feature/backend-ai；C 用 feature/data-docs

# 6. 日常工作循環
git status               # 看自己改了什麼
git add <檔案>            # 加入要提交的檔案
git commit -m "feat: ..." # 小步提交，訊息說明實際修改
git push origin feature/frontend-upload

# 7. 在 GitHub 網頁上開 Pull Request，隊友審查後才合併
# 8. 合併後更新本地：
git checkout main && git pull origin main
```

> ⚠️ 禁止：直接推 `main`、`git reset --hard`、`git push --force`。`.env` 永不提交（`.gitignore` 會排除）。

---

## 九、Day 1 DeepSeek Key 驗證（隊員 B，不含真實金鑰）

```bash
# 把金鑰放在環境變數（不要寫進任何檔案）
export DEEPSEEK_API_KEY="你的金鑰"

# 最小文字測試
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -d '{"model":"deepseek-flash","messages":[{"role":"user","content":"Reply with json: {\"ok\":true}"}],"response_format":{"type":"json_object"},"max_tokens":100}'
```

- 回 200 + JSON → key 可用，隔天正常整合。
- 回 401 → key 錯；回 402 → 餘額不足 → **立即報告全隊，不得繼續假裝 AI 可用**。

---

## 十、風險與備援

| 風險 | 等級 | 對策 |
| --- | --- | --- |
| API key 無效／無餘額 | 未知 | D1 晚 curl 驗證；失敗即如實報告，不得假冒 AI |
| DeepSeek 偶發空 JSON | 中 | 後端 retry 一次＋錯誤處理（官方已注明此問題） |
| 7 天時程不足 | 高 | 嚴格 MVP；C 的材料軌與開發並行，不互相等待 |
| 部署 CORS／HTTPS 問題 | 中 | D5 專門處理；本地先驗證 getUserMedia |
| 測試招募不到人 | 中 | 最晚 10/05 晚完成；否則如實標示「待完成」 |
| 相機權限被拒 | 必發 | 上傳替代＋英文提示 |
| 決賽網絡故障 | 中 | 離線影片＋截圖＋預錄結果（明確標示非即時） |

---

## 十一、需要隊員立即決定

1. **DeepSeek API key 今晚驗證結果**（最關鍵未知，決定 D2 整合是否進行）。
2. 三人角色 A／B／C 最終確認。
3. 作品英文名確認為 "EcoScan AI"（影響所有交件檔名）。
