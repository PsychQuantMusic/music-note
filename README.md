# 阿澈的音樂筆記（music-note）

**🌐 <https://music-note-psych-quant.vercel.app/>**

靜態音樂筆記網站（Astro）。兩大內容軸：

1. **筆記** — 混音理論（framing 系列、實踐認識論系列）、技術 cheatsheets、問答集。源自 `che_workspace/music/notes/`。
2. **麥克風頻響資料庫** — 互動頻響曲線圖表，build 時讀 [`PsychQuantMusic/mic-frequency-response`](https://github.com/PsychQuantMusic/mic-frequency-response) 的 CSV（該 repo 的 CSV = source of truth，schema：`freq_hz,level_db` / `angle_deg,level_db` + `meta.yaml`）。

## 架構定位（2 repo、CSV contract 相接）

```
mic-frequency-response/          ← 資料 repo（CSV = source of truth）
└── data/<brand>-<model>/*.csv

music-note/（本 repo）            ← 網站 repo（靜態、無後端）
└── build 時讀上面的 CSV → 渲染互動圖表
```

設計原則：**CSV 是穩定 contract**，網站與資料庫刻意分開——工具可換，資料不動。總體設計見本 repo issue #1；資料庫端設計見 mic-frequency-response#1。

## 開發

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # 靜態輸出到 dist/
```

技術棧：Astro（與 [che-cheng-website](https://github.com/kiki830621/che-cheng-website) 同棧）。

## 狀態

**已上線**（2026-07-10，Phase D；#6 遷移 Vercel）：兩 repo public，Vercel 部署
（team psych-quant、根路徑、production 公開、**push main 自動部署**）。資料更新流程：
`git submodule update --remote data/mic-frequency-response` + commit + push 即重新部署。
⚠ `music-note.vercel.app`（無 team 後綴）是他人撞名 project，本站 URL 帶 `-psych-quant`。
