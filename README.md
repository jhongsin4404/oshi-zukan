# 推し図鑑（Oshi Zukan）— 專案骨架

這是偶像/演員/コンカフェ嬢收藏圖鑑的 Vite + React + Supabase 專案骨架。

## 一、本機跑起來

```bash
npm install
```

複製 `.env.example` 成 `.env`，填入你 Supabase 專案的網址和 anon key（在 Supabase Dashboard → Project Settings → API 可以找到）：

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

接著：

```bash
npm run dev
```

如果 `.env` 還沒設定或 Supabase 資料表還是空的，畫面會自動 fallback 顯示範例資料，不會白屏。

## 二、設定 Supabase（存文字資料）

1. 到 [supabase.com](https://supabase.com) 建立一個新專案
2. 進到 SQL Editor，貼上 `supabase/schema.sql` 的內容並執行 → 會建好 `people` 資料表，並插入三筆範例資料
3. 之後要新增/編輯人物資料，直接到左側「Table Editor」點 `people` 這張表，
   像操作 Excel 一樣點格子打字或貼上就好，存檔後網站重新整理就會看到更新——不用重新部署、不用寫程式碼

## 三、設定 Cloudflare R2（存照片）

照片統一放在 Cloudflare R2，好處是**完全不收流量費**，不用擔心之後圖片被大量瀏覽而產生額外費用。
這一步全程用滑鼠點選就能完成，不需要寫任何程式碼：

1. 到 [dash.cloudflare.com](https://dash.cloudflare.com) 免費註冊帳號
   - 開通 R2 需要先綁一張信用卡，但只要沒超過免費額度（每月 10GB 儲存）就不會扣款
2. 左側選單找到「R2」→「Create bucket」，取個名字（例如 `oshi-zukan-photos`）→ 建立
3. 進到這個 bucket 的設定，找到「Public access」，把它打開
   （打開後會拿到一個公開網址前綴，類似 `https://pub-xxxx.r2.dev`）
4. 之後要放照片，直接在這個介面按「Upload」拖拉上傳即可
5. 上傳完點該張圖，複製它的公開網址

拿到網址後，回到 Supabase 的 Table Editor，把網址貼進對應人物那一列的 `photo_url` 欄位——
`App.jsx` 裡本來就是「有 `photo_url` 就顯示照片，沒有就顯示姓氏色塊」，
不管網址是從哪裡來的，網站端完全不用改任何程式碼。

## 四、部署到 Netlify

1. 把這個專案推到 GitHub（一個新的 repo）
2. 到 [netlify.com](https://netlify.com) → Add new site → Import from Git → 選你的 repo
3. Build command 填 `npm run build`，Publish directory 填 `dist`
4. 在 Netlify 的 Site settings → Environment variables，把 `.env` 裡的兩個 Supabase 變數加進去
5. Deploy，完成後會拿到一個 `xxx.netlify.app` 的網址

## 檔案結構

```
oshi-zukan/
  src/
    App.jsx            主要畫面（卡片、稀有度、篩選、彈窗都在這）
    supabaseClient.js   Supabase 連線設定
    main.jsx            React 進入點
  supabase/
    schema.sql           資料表建立指令
  .env.example           環境變數範例（複製成 .env 後填自己的值）
```

## 之後可以擴充的方向

- 目前 `collected` 欄位是全站共用的，如果之後要做「每個使用者自己的收藏進度」，
  建議拆一張 `user_collections`（user_id + person_id）表，並加上 Supabase Auth 登入
- 圖片建議統一轉成 WebP、卡片用圖抓 600×800 左右即可，載入會比較快
- 目前的稀有度、類型是寫死在程式碼裡的（`RARITY_META` / `TYPE_META`），
  如果之後種類變多，也可以搬進 Supabase 的另一張表
