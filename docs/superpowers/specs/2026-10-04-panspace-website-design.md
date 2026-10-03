# Pan's Space 個人網站 — 設計規格

- 日期：2026-10-04
- 狀態：待使用者審閱
- 網址：https://panspace.me

## 1. 目的與受眾

放個人經歷與作品的網站，用途為**綜合型**：求職、接案、個人品牌三者兼顧。**不做部落格**。

- 主要訪客：招募者／面試官、潛在接案客戶、學界與社群同好
- 首頁主軸：**產品型開發者**——「能把想法做成上線產品的人」。AI／CV 研究作為深度證明，教學與社群領導作為補充
- 成功標準：
  1. 訪客 10 秒內知道「他是誰、做出過什麼、怎麼聯絡」
  2. 網站本身的 UI/UX 與互動足以作為一件作品——「不只是單純的個人網站」
  3. 單一作品可直接以連結分享

## 2. 已定案決策

| 項目 | 決定 |
|---|---|
| 語言 | 中英雙語，`/zh`、`/en`，切換時停留在同一頁 |
| 網站結構 | 首頁 Bento ＋ 獨立作品頁 ＋ 作品列表 ＋ 關於我 |
| 視覺 | 深色、工程感、Bento 拼貼格（風格 B × D 混搭） |
| 招牌互動 | Spotlight 觸感 ＋ 首訪 Boot Sequence ＋ OS 式卡片形變與 ⌘K 指令面板 |
| 技術 | Astro ＋ React islands ＋ Motion，View Transitions |
| 內容維護 | 內容放在 repo（YAML／MDX），push 後自動部署，更新頻率低 |
| 部署 | Cloudflare Workers Static Assets ＋ Workers Builds |
| Repo | GitHub 公開 |

## 3. 網域

DNS 都在 Cloudflare 上。

| 網域 | 用途 |
|---|---|
| `panspace.me` | **主站**，與 email `poter.pan@panspace.me` 一致 |
| `www.panspace.me` | 301 → `https://panspace.me` |
| `panspace.dev`（根網域） | 301 → `https://panspace.me`，保留路徑 |
| `*.panspace.dev` | 使用者的開發測試場，與本站無關，**不可**放置作品集內容 |

轉址以 Cloudflare Redirect Rules 實作，不寫程式。

## 4. 頁面與路由

```
/                 依 Accept-Language 導向 /zh 或 /en；若已選過語言則以記錄為準
/{lang}           首頁
/{lang}/work      作品列表
/{lang}/work/{slug} 作品頁
/{lang}/about     關於我
/404              OS 風格的「command not found」頁
/resume-zh.pdf, /resume-en.pdf   履歷 PDF（可後補；檔案不存在時隱藏下載入口）
```

`{lang}` ∈ `zh`, `en`。

**不在範圍內**：部落格、聯絡表單、留言、訪客計數器、CMS 後台、深淺色切換（本站只有深色）。

## 5. 內容模型

```
src/content/
├── profile.yaml        名字、一句話介紹（zh/en）、社群連結、email、接案狀態（open | busy）
├── experience.yaml     經歷時間軸，每筆含 type、起訖、zh/en 標題與描述
├── awards.yaml         獎項與論文，含年份、zh/en 名稱、名次
└── projects/{slug}/
    ├── meta.yaml       語言無關欄位（schema 見下）
    ├── zh.mdx          frontmatter：title、summary；正文
    ├── en.mdx          同上，英文
    └── images/         由 Astro 建置時最佳化
```

`experience.yaml` 的 `type` ∈ `education`、`work`（實習、研究助理）、`teaching`（教學與社群）、`freelance`。

**`meta.yaml` schema**（以 Astro content collection 的 zod schema 強制驗證）：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `date` | `YYYY-MM` | 起始時間 |
| `end` | `YYYY-MM` \| `present` \| 省略 | |
| `categories` | `("ios"\|"web"\|"ai"\|"research"\|"competition")[]` | 作品列表篩選 |
| `stack` | `string[]` | |
| `role` | `{zh, en}` | 例如「獨立開發」 |
| `links` | `{appStore?, website?, github?, demo?}` | |
| `featured` | `number` \| 省略 | 精選順序；有值才會出現在首頁 Bento |
| `bento` | `"wide"` \| `"regular"` | 首頁卡片大小 |
| `cover` | 圖片路徑 | 卡片與作品頁主視覺，也是形變的共用元素 |
| `confidential` | `boolean` | 見下方規則 |
| `listOrder` | `number` \| 省略 | 覆寫作品列表排序，用於把小作品排到最後 |

zod schema 要求 zh 與 en 兩個版本都存在，缺任一個就建置失敗。

**作品頁正文固定段落**：背景與問題 → 我的角色 → 做法與技術決策 → 成果 → 學到什麼。

**可在 MDX 中使用的元件**：`<Gallery>`（截圖輪播）、`<Compare>`（前後對比）、`<Diagram>`（架構圖）、`<Stat>`（數據卡）、程式碼區塊。

**`confidential: true` 規則**：
- 不渲染 `links.github`
- 側欄顯示「商業專案・客戶資訊保密」
- 內文與 meta 中**不得出現客戶或廠商名稱**

## 6. 內容清單（第一版）

**精選（首頁 Bento，依序）**

| # | slug | 作品 | 備註 |
|---|---|---|---|
| 1 | `ntutbox` | NTUTBox 北科盒子 | `bento: wide`；App、官網、排課器、打卡系統、狀態頁 |
| 2 | `spine-ai` | 脊椎 X 光 AI | 合作單位寫「醫學中心」，不寫院名 |
| 3 | `chippot` | ChipPot | 公開 repo |
| 4 | `basketball-analysis` | 籃球動作分析 | `confidential: true`，不寫客戶 |
| 5 | `locmotion` | LocMotion | 公開 repo |

**作品列表另外收錄**：台北交通風險地圖、AR 校園導覽、FCU 簽到 App、競賽作品（健康寶寶、無痕地球、享愛家園、專注時刻）。最後是 asr-server（`listOrder` 排到最末，不精選）。

**內容規則**：
- **只放有說服力的數字**。例如 FCU 簽到 App 的安裝數不寫
- **永不公開**：手機號碼、家庭背景、出生資料、契約掃描、學號、灰色地帶的 repo（搶票、選課、簽到腳本等）
- 文案由 Claude 根據 GitHub README 與研究所資料起草中英初稿，使用者審閱修改

**已確認的事實**：
- 地點：台北（研究所）；大學時期在台中
- iOS Club：第 6 屆教學（2022-08 ~ 2023-07）、第 7 屆社長（2023-08 ~ 2024-07）、第 8 屆網管（2024-08 ~ 2025-07）

## 7. 首頁

1. **Boot Sequence**（island）
   - 只在 `/{lang}` 首頁、且是首次造訪時播放（`localStorage` 記錄；讀寫失敗時視為已看過，不播放）
   - 總長不超過 2.5 秒，按任意鍵或點擊即可跳過
   - 以下情況不播放：`prefers-reduced-motion`、從其他頁導覽而來
   - 播放期間，Bento 的 HTML 已經在頁面上，只是被遮住，所以不影響 SEO 或 LCP 的量測
2. **Bento 牆**
   - 桌機 4 欄（版位見下圖）、平板 2 欄、手機單欄；在手機上 Hero 與 NTUTBox 仍是大卡
   ```
   ┌──────────────┬──────────────────────────┐
   │ Hero (2×2)   │ NTUTBox (2×1, 含截圖)     │
   │              ├────────────┬─────────────┤
   │              │ Spine AI   │ ChipPot     │
   ├──────┬───────┼────────────┼─────────────┤
   │ 獎項 │ 技術   │ 籃球分析    │ LocMotion   │
   ├──────┴───────┴────────────┴─────────────┤
   │ ● 接案狀態 · email · GitHub · LinkedIn       │
   └─────────────────────────────────────────┘
   ```
3. **經歷精簡版**：最近 4 至 5 筆，最後有連結「完整經歷 →」到 `/about`
4. **聯絡區**：email 複製按鈕、履歷下載、社群連結

## 8. 作品列表、作品頁、關於我

- **`/work`**
  - 篩選標籤：全部、iOS、Web、AI/CV、研究、競賽
  - 篩選時用 Motion layout animation 讓卡片重新排列
  - 排序：精選作品依 `featured`，其餘依 `date` 新到舊；有 `listOrder` 的依其值排在最後
- **`/work/{slug}`**
  - 頁首：等寬字路徑小標 `~/work/{slug}`、標題、摘要、標籤、外部連結
  - 主視覺：`cover`
  - 側欄：角色、期間、技術、本頁目錄。桌機固定在側邊，手機則收合到頁首下方
  - 底部：上一個／下一個作品
- **`/about`**
  - 開頭 3 至 4 句自我介紹，加上照片（可後補）
  - 可依類型篩選的經歷時間軸，捲動時線條逐步畫出
  - 獎項與論文
  - 依領域分組的技能（**不放**熟練度百分比條）
  - 聯絡方式

## 9. 互動規格

| 互動 | 桌機（`pointer: fine`） | 觸控 | `prefers-reduced-motion` |
|---|---|---|---|
| Spotlight 光暈與 3D 傾斜 | 滑鼠懸停時；傾斜 ≤ 7° | 按下時縮放到 0.98 | 關閉 |
| 卡片 → 作品頁形變 | Astro View Transitions：卡片、標題、封面各自有 `view-transition-name`；上一頁會反向形變 | 同左 | 淡入淡出 |
| ⌘K 指令面板 | `⌘K`、`Ctrl+K`、`/` 叫出 | 右下角浮動按鈕 | 可用，但不帶動畫 |
| 作品列表重新排列 | layout animation | 同左 | 直接切換 |

- **⌘K 面板項目**：所有頁面與作品、切換中／英（停留同頁）、複製 email、下載履歷、開啟 GitHub、開啟 LinkedIn。支援模糊搜尋與方向鍵操作
- **退回方案**：不支援 View Transitions 的瀏覽器使用一般換頁；所有互動在 JS 載入失敗時都不影響閱讀與導覽（漸進增強）

## 10. 視覺系統

- **色彩**：深色底（約 `#07080a`），卡片約 `#101216`，線條約 `#1f232b`；主強調色綠 `#34d399`，次強調色藍 `#60a5fa`。最終數值在實作時微調，但文字對比度必須符合 WCAG AA
- **背景**：細網格
- **字型**：英文用 Geist 與 Geist Mono，自行託管；中文用系統字體（`PingFang TC`、`Microsoft JhengHei`）
- **OS 元素**：等寬字路徑小標、狀態燈、`kbd` 按鍵提示，用在導覽與標題，不要過度使用

## 11. 工程與品質

- **效能**（CI 強制檢查）：
  - Lighthouse 四項 ≥ 95（行動版）
  - 首頁 JS 壓縮後 < 100 KB
  - 圖片由 `astro:assets` 輸出 AVIF/WebP 與 `srcset`
- **無障礙**：
  - 全站可以鍵盤操作，Bento 卡片是可聚焦的連結
  - ⌘K 面板符合 combobox／listbox ARIA 模式，開啟時鎖住焦點、`Esc` 關閉
  - 焦點框清楚可見
- **SEO**：
  - 每頁有 `hreflang`（zh-Hant、en、x-default）、canonical、sitemap
  - JSON-LD：`Person`（首頁、關於我）、`CreativeWork`（作品頁）
  - 每個作品在建置時產生 OG 圖（深色 OS 風格）
- **數據**：Cloudflare Web Analytics，不使用 cookie
- **測試**：
  - `astro check`
  - Playwright：每個路由的中英版本都回應 200、⌘K 能開啟並跳轉、reduced-motion 下不播放 Boot、語言切換停留同頁
  - 連結檢查
  - Lighthouse CI
- **CI／部署**：
  - GitHub Actions 在 PR 上跑上述檢查
  - Cloudflare Workers Builds 在 push 到 `main` 時部署，PR 產生預覽網址

## 12. 待後補（不阻擋上線）

- 個人照片
- 履歷 PDF（中英）
- 各作品的高品質截圖：初版可先用現有截圖
