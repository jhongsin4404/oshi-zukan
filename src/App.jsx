import { useState, useMemo, useEffect } from "react";
import { Search, Heart, X, Star } from "lucide-react";
import { supabase } from "./supabaseClient";

// ---------- Mock data ----------
// 真實上線時，圖片建議改用官方釋出的宣傳素材或自製插畫，避免直接盜用寫真照片
const TYPE_META = {
  idol: { label: "偶像", accent: "#FF6FA0", soft: "#FFE1ED" },
  actor: { label: "演員", accent: "#5FD9B9", soft: "#DEFAF1" },
  concafe: { label: "コンカフェ嬢", accent: "#B48CFF", soft: "#ECE1FF" },
};

// 稀有度：五階段，星星數 = 稀有等級，數字越高越難抽到
const RARITY_META = {
  N: { label: "N", name: "ノーマル", stars: 1, color: "#B9AFC7", soft: "#F1EDF6" },
  R: { label: "R", name: "レア", stars: 2, color: "#5FA8FF", soft: "#E4F0FF" },
  SR: { label: "SR", name: "スペシャルレア", stars: 3, color: "#FFB23C", soft: "#FFF1DA" },
  SSR: { label: "SSR", name: "プレミアムレア", stars: 4, color: "#FF6FA0", soft: "#FFE9F2" },
  UR: { label: "UR", name: "アルティメットレア", stars: 5, color: "#B84DFF", soft: "#F3E6FF" },
};
const RARITY_ORDER = ["N", "R", "SR", "SSR", "UR"];
const GLOW_TIERS = ["SSR", "UR"]; // 這兩階會有發散光暈 + 閃亮效果

const PEOPLE = [
  { id: 1, name: "星野 陽菜", kana: "ホシノ ヒナ", type: "idol", group_name: "Prism*Link", no: "001", rarity: "UR", collected: true },
  { id: 2, name: "百合川 澪", kana: "ユリカワ ミオ", type: "idol", group_name: "Prism*Link", no: "002", rarity: "SR", collected: true },
  { id: 3, name: "橘 あかり", kana: "タチバナ アカリ", type: "idol", group_name: "Prism*Link", no: "003", rarity: "R", collected: false },
  { id: 4, name: "神楽坂 蓮", kana: "カグラザカ レン", type: "idol", group_name: "月光カラット", no: "004", rarity: "SSR", collected: true },
  { id: 5, name: "白瀬 ことね", kana: "シラセ コトネ", type: "idol", group_name: "月光カラット", no: "005", rarity: "N", collected: false },
  { id: 6, name: "水無月 玲", kana: "ミナヅキ レイ", type: "actor", group_name: "劇団 灯", no: "006", rarity: "R", collected: true },
  { id: 7, name: "朝比奈 蒼", kana: "アサヒナ アオイ", type: "actor", group_name: "劇団 灯", no: "007", rarity: "N", collected: false },
  { id: 8, name: "深山 悠人", kana: "ミヤマ ユウト", type: "actor", group_name: "フリー", no: "008", rarity: "N", collected: false },
  { id: 9, name: "雪村 りん", kana: "ユキムラ リン", type: "concafe", group_name: "夜想曲", no: "009", rarity: "SSR", collected: true },
  { id: 10, name: "花菱 まや", kana: "ハナビシ マヤ", type: "concafe", group_name: "夜想曲", no: "010", rarity: "R", collected: false },
  { id: 11, name: "紫藤 のあ", kana: "シドウ ノア", type: "concafe", group_name: "Cafe Lumière", no: "011", rarity: "N", collected: false },
  { id: 12, name: "早乙女 楓", kana: "サオトメ カエデ", type: "idol", group_name: "月光カラット", no: "012", rarity: "SR", collected: true },
];

function initials(name) {
  return name.slice(0, 1);
}

function RarityStars({ rarity, size = 10 }) {
  const meta = RARITY_META[rarity];
  return (
    <span className="rarity-stars" style={{ "--rc": meta.color }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} fill={i < meta.stars ? meta.color : "transparent"} stroke={meta.color} strokeWidth={1.5} />
      ))}
    </span>
  );
}

function PersonCard({ person, onToggle, onOpen }) {
  const meta = TYPE_META[person.type];
  const rmeta = RARITY_META[person.rarity];
  const isGlow = GLOW_TIERS.includes(person.rarity);
  return (
    <div className="card-slot" style={{ "--accent": meta.accent, "--soft": meta.soft, "--rarity": rmeta.color, "--rarity-soft": rmeta.soft }}>
      {person.collected ? (
        <div className={`card-frame rarity-${person.rarity}`}>
          <button className={`candy-card ${isGlow ? "is-glow" : ""}`} onClick={() => onOpen(person)} aria-label={`查看 ${person.name}`}>
            <span className={`rarity-tag ${person.rarity === "UR" ? "is-UR" : ""}`}>{rmeta.label}</span>
            <span className="get-badge"><Heart size={11} fill="white" strokeWidth={0} />GET</span>
            <div className="portrait" aria-hidden="true">
              {person.photo_url ? (
                <img className="portrait-photo" src={person.photo_url} alt="" />
              ) : (
                <span className="portrait-glyph">{initials(person.name)}</span>
              )}
              <span className="sparkle sparkle-a">✦</span>
              <span className="sparkle sparkle-b">✧</span>
              {isGlow && (
                <>
                  <span className="sparkle twinkle t1">✦</span>
                  <span className="sparkle twinkle t2">✧</span>
                  <span className="sparkle twinkle t3">✦</span>
                </>
              )}
            </div>
            <div className="card-info">
              <RarityStars rarity={person.rarity} />
              <p className="card-name">{person.name}</p>
              <p className="card-kana">{person.kana}</p>
            </div>
            <span className="type-chip">{meta.label}</span>
            {isGlow && <span className="shine-sweep" aria-hidden="true" />}
          </button>
        </div>
      ) : (
        <button className="candy-wrap" onClick={() => onToggle(person.id)} aria-label={`解鎖 ${person.name}`}>
          <span className="wrap-twist wrap-twist-l" />
          <span className="wrap-twist wrap-twist-r" />
          <span className="wrap-no">No.{person.no}</span>
          <span className="wrap-bubble">？</span>
          <span className="wrap-label">輕點開封</span>
        </button>
      )}
    </div>
  );
}

function DetailModal({ person, onClose, onToggle }) {
  if (!person) return null;
  const meta = TYPE_META[person.type];
  const rmeta = RARITY_META[person.rarity];
  const isGlow = GLOW_TIERS.includes(person.rarity);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-panel rarity-${person.rarity}`}
        style={{ "--accent": meta.accent, "--soft": meta.soft, "--rarity": rmeta.color, "--rarity-soft": rmeta.soft }}
        onClick={(e) => e.stopPropagation()}
      >
        {isGlow && <span className="modal-glow" aria-hidden="true" />}
        <button className="modal-close" onClick={onClose} aria-label="關閉">
          <X size={16} />
        </button>
        <span className={`modal-ribbon ${person.rarity === "UR" ? "is-UR" : ""}`}>
          {rmeta.label}・{rmeta.name}
        </span>
        <div className="modal-portrait">
          {person.photo_url ? (
            <img className="modal-portrait-photo" src={person.photo_url} alt="" />
          ) : (
            <span>{initials(person.name)}</span>
          )}
        </div>
        <RarityStars rarity={person.rarity} size={13} />
        <span className="type-chip modal-chip">{meta.label}</span>
        <h2 className="modal-name">{person.name}</h2>
        <p className="modal-kana">{person.kana}</p>
        <dl className="modal-meta">
          <div>
            <dt>所屬</dt>
            <dd>{person.group_name}</dd>
          </div>
          <div>
            <dt>圖鑑編號</dt>
            <dd>No.{person.no}</dd>
          </div>
        </dl>
        <button className="modal-unmark" onClick={() => onToggle(person.id)}>
          從圖鑑中移除收藏
        </button>
      </div>
    </div>
  );
}

export default function IdolZukan() {
  // 一開始先用 mock data 顯示畫面，等 Supabase 抓到真實資料後會自動替換
  const [people, setPeople] = useState(PEOPLE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [activeRarity, setActiveRarity] = useState("all");
  const [openPerson, setOpenPerson] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPeople() {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .order("no", { ascending: true });

      if (cancelled) return;

      if (error) {
        // 抓不到資料庫（例如還沒設定 .env）時，保留 mock data 讓畫面還能運作
        setLoadError(error.message);
      } else if (data && data.length > 0) {
        setPeople(data);
      }
      setLoading(false);
    }

    loadPeople();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCollected = async (id) => {
    const target = people.find((p) => p.id === id);
    if (!target) return;
    const nextCollected = !target.collected;

    // 先更新畫面（樂觀更新），再同步寫回 Supabase
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, collected: nextCollected } : p)));

    const { error } = await supabase.from("people").update({ collected: nextCollected }).eq("id", id);
    if (error) {
      // 寫入失敗就退回原本的狀態，並提示錯誤
      setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, collected: !nextCollected } : p)));
      console.error("更新收藏狀態失敗：", error.message);
    }
  };

  const filtered = useMemo(() => {
    return people.filter((p) => {
      const matchesType = activeType === "all" || p.type === activeType;
      const matchesRarity = activeRarity === "all" || p.rarity === activeRarity;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.kana.toLowerCase().includes(q) || (p.group_name || "").toLowerCase().includes(q);
      return matchesType && matchesRarity && matchesQuery;
    });
  }, [people, query, activeType, activeRarity]);

  const totalCollected = people.filter((p) => p.collected).length;
  const rarityBreakdown = RARITY_ORDER.map((r) => ({
    rarity: r,
    collected: people.filter((p) => p.rarity === r && p.collected).length,
    total: people.filter((p) => p.rarity === r).length,
  }));

  return (
    <div className="zukan-root">
      <style>{`
        .zukan-root {
          --bg: #FFF7FB;
          --ink: #4A2E43;
          --ink-soft: #B98CA8;
          --line: #FFDCEA;
          --pink: #FF6FA0;
          --lilac: #B48CFF;
          --mint: #5FD9B9;
          font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
          background:
            radial-gradient(circle at 8% 12%, rgba(255,111,160,0.16) 0, transparent 40%),
            radial-gradient(circle at 92% 18%, rgba(180,140,255,0.16) 0, transparent 38%),
            radial-gradient(circle at 50% 92%, rgba(95,217,185,0.14) 0, transparent 42%),
            var(--bg);
          color: var(--ink);
          min-height: 100%;
          padding: 30px 20px 60px;
          position: relative;
        }

        .zukan-header { max-width: 980px; margin: 0 auto 6px; text-align: center; }
        .eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.14em;
          color: var(--pink); text-transform: uppercase;
          background: white; padding: 5px 14px; border-radius: 999px;
          box-shadow: 0 2px 0 var(--line);
        }
        .zukan-title {
          margin: 14px 0 2px; font-size: clamp(30px, 6vw, 42px); font-weight: 800; letter-spacing: 0.02em;
          background: linear-gradient(100deg, var(--pink), var(--lilac) 55%, var(--mint));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .zukan-sub { color: var(--ink-soft); font-size: 13.5px; font-weight: 600; margin: 0; }
        .zukan-status { color: var(--lilac); font-size: 11.5px; font-weight: 700; margin: 8px 0 0; }

        .rarity-board { max-width: 700px; margin: 22px auto 8px; display: flex; gap: 9px; justify-content: center; flex-wrap: wrap; }
        .rarity-pill {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          background: white; border-radius: 16px; padding: 10px 14px;
          box-shadow: 0 0 0 2px var(--pc-soft), 0 4px 10px -6px rgba(74,46,67,0.3);
          min-width: 64px; position: relative;
        }
        .rarity-pill.tier-SSR { box-shadow: 0 0 0 2px var(--pc), 0 4px 14px -6px rgba(255,111,160,0.5); }
        .rarity-pill.tier-UR { box-shadow: 0 0 0 2px var(--pc), 0 4px 16px -6px rgba(184,77,255,0.55); }
        .rarity-pill-label { font-size: 12px; font-weight: 800; color: var(--pc); letter-spacing: 0.03em; }
        .rarity-pill.tier-UR .rarity-pill-label {
          background: linear-gradient(90deg, #FF6FA0, #FFD766, #5FD9B9, #6FA8FF, #B84DFF, #FF6FA0);
          background-size: 300% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: gradient-shift 3s linear infinite;
        }
        .rarity-pill-count { font-size: 11px; font-weight: 700; color: var(--ink-soft); }
        .rarity-pill-stars { display: flex; gap: 1px; }

        .progress-row { max-width: 380px; margin: 16px auto 22px; display: flex; align-items: center; gap: 8px; justify-content: center; }
        .progress-track { width: 140px; height: 6px; border-radius: 999px; background: white; box-shadow: inset 0 0 0 1.5px var(--line); overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--pink), var(--lilac)); }
        .progress-label { font-size: 11px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; }

        .toolbar { max-width: 780px; margin: 0 auto 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center; }
        .search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 320px; }
        .search-wrap svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--pink); }
        .search-input {
          width: 100%; background: white; border: 2px solid var(--line); border-radius: 999px;
          padding: 10px 14px 10px 38px; color: var(--ink); font-size: 13.5px; font-weight: 600; outline: none; box-sizing: border-box;
        }
        .search-input:focus { border-color: var(--pink); }
        .search-input::placeholder { color: #D9B9CB; font-weight: 500; }

        .type-tabs, .rarity-tabs { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .rarity-tabs { max-width: 780px; margin: 0 auto 26px; }
        .type-tab {
          border: 2px solid var(--line); background: white; color: var(--ink-soft);
          font-size: 12.5px; font-weight: 700; padding: 8px 16px; border-radius: 999px;
          cursor: pointer; transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .type-tab:hover { transform: translateY(-1px); }
        .type-tab.active { background: var(--tab-accent, var(--pink)); border-color: var(--tab-accent, var(--pink)); color: white; box-shadow: 0 3px 0 rgba(0,0,0,0.08); }

        .grid { max-width: 980px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 26px 18px; }
        .card-slot { aspect-ratio: 3 / 4.3; position: relative; }

        .card-frame { position: relative; width: 100%; height: 100%; }
        /* 發散光暈：呼吸感的模糊光斑，取代旋轉光環，天然圓角不需要 overflow 裁切 */
        .card-frame.rarity-SSR::before,
        .card-frame.rarity-UR::before {
          content: ""; position: absolute; inset: -16px; z-index: 0; border-radius: 50%;
          filter: blur(16px); animation: pulse-glow 2.4s ease-in-out infinite;
        }
        .card-frame.rarity-SSR::before { background: radial-gradient(circle, var(--rarity) 0%, transparent 72%); opacity: 0.55; }
        .card-frame.rarity-UR::before {
          background: conic-gradient(from 0deg, #FF6FA0, #FFD766, #5FD9B9, #6FA8FF, #B84DFF, #FF6FA0);
          opacity: 0.5; animation: pulse-glow 2.4s ease-in-out infinite, hue-cycle 4.5s linear infinite;
        }
        @keyframes pulse-glow { 0%,100% { opacity: 0.35; transform: scale(0.92); } 50% { opacity: 0.7; transform: scale(1.08); } }
        @keyframes hue-cycle { from { filter: blur(16px) hue-rotate(0deg); } to { filter: blur(16px) hue-rotate(360deg); } }
        @keyframes gradient-shift { to { background-position: 300% 0; } }

        .candy-card {
          all: unset; box-sizing: border-box; display: flex; flex-direction: column;
          width: 100%; height: 100%; cursor: pointer; position: relative; z-index: 1;
          background: white; border-radius: 22px; border: 4px solid white; overflow: hidden;
          box-shadow: 0 0 0 3px var(--rarity), 6px 8px 0 -1px var(--soft), 0 10px 18px -8px rgba(74,46,67,0.28);
          transition: transform 0.16s ease;
        }
        .candy-card:hover { transform: translateY(-4px) rotate(-1deg); }
        .candy-card:focus-visible { outline: 3px solid var(--rarity); outline-offset: 2px; }
        .candy-card.is-glow { box-shadow: 0 0 0 3px var(--rarity), 6px 8px 0 -1px var(--soft), 0 12px 22px -8px var(--rarity); }

        .shine-sweep {
          position: absolute; inset: 0; z-index: 2; pointer-events: none;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.7) 46%, transparent 62%);
          background-size: 250% 250%; animation: shine-sweep 2.6s ease-in-out infinite;
        }
        @keyframes shine-sweep { 0% { background-position: 220% 220%; } 100% { background-position: -40% -40%; } }

        .rarity-tag {
          position: absolute; top: 8px; left: 8px; z-index: 3;
          background: var(--rarity); color: white; font-size: 10px; font-weight: 800;
          padding: 3px 8px; border-radius: 999px; box-shadow: 0 2px 0 rgba(0,0,0,0.08); letter-spacing: 0.03em;
        }
        .rarity-tag.is-UR {
          background: linear-gradient(90deg, #FF6FA0, #FFD766, #5FD9B9, #6FA8FF, #B84DFF, #FF6FA0);
          background-size: 300% 100%; animation: gradient-shift 3s linear infinite;
        }
        .get-badge {
          position: absolute; top: 8px; right: 8px; z-index: 3;
          background: var(--accent); color: white; font-size: 9.5px; font-weight: 800;
          padding: 3px 8px 3px 6px; border-radius: 999px; display: flex; align-items: center; gap: 3px;
          box-shadow: 0 2px 0 rgba(0,0,0,0.08);
        }
        .portrait {
          flex: 1; display: flex; align-items: center; justify-content: center; position: relative;
          background: linear-gradient(155deg, var(--accent) 0%, var(--soft) 130%);
          border-radius: 18px 18px 0 0; overflow: hidden;
        }
        .portrait-glyph { font-size: 34px; font-weight: 800; color: white; text-shadow: 0 2px 0 rgba(0,0,0,0.08); }
        .portrait-photo { width: 100%; height: 100%; object-fit: cover; }
        .sparkle { position: absolute; color: white; opacity: 0.85; font-size: 14px; }
        .sparkle-a { top: 12px; left: 14px; }
        .sparkle-b { bottom: 14px; right: 16px; font-size: 11px; }
        .sparkle.twinkle { animation: twinkle 1.6s ease-in-out infinite; }
        .t1 { top: 20%; right: 20%; font-size: 12px; animation-delay: 0s; }
        .t2 { bottom: 30%; left: 18%; font-size: 10px; animation-delay: 0.4s; }
        .t3 { top: 55%; right: 30%; font-size: 9px; animation-delay: 0.8s; }
        @keyframes twinkle { 0%,100% { opacity: 0.2; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.15); } }

        .card-info { padding: 6px 10px 24px; text-align: center; }
        .rarity-stars { display: inline-flex; gap: 1px; margin-bottom: 2px; }
        .rarity-stars svg { color: var(--rc); }
        .card-name { margin: 0; font-size: 13px; font-weight: 800; }
        .card-kana { margin: 1px 0 0; font-size: 10px; color: var(--ink-soft); font-weight: 600; }
        .type-chip {
          position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
          font-size: 9.5px; font-weight: 800; background: var(--accent); color: white;
          padding: 3px 10px; border-radius: 999px; white-space: nowrap;
        }

        .candy-wrap {
          all: unset; box-sizing: border-box; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px;
          width: 100%; height: 100%; cursor: pointer; position: relative; border-radius: 22px;
          background: repeating-linear-gradient(125deg, var(--soft) 0 10px, white 10px 20px);
          box-shadow: 0 0 0 3px var(--line), 0 8px 16px -10px rgba(74,46,67,0.2);
          transition: transform 0.16s ease;
        }
        .candy-wrap:hover { transform: translateY(-3px) scale(1.02); }
        .candy-wrap:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
        .wrap-twist { position: absolute; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 11px solid transparent; border-bottom: 11px solid transparent; }
        .wrap-twist-l { left: -9px; border-right: 12px solid var(--accent); }
        .wrap-twist-r { right: -9px; border-left: 12px solid var(--accent); }
        .wrap-no { position: absolute; top: 10px; left: 12px; font-size: 10px; font-weight: 800; color: var(--ink-soft); }
        .wrap-bubble {
          width: 46px; height: 46px; border-radius: 50%; background: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 800; color: var(--accent); box-shadow: 0 0 0 3px var(--accent);
        }
        .wrap-label { font-size: 10.5px; font-weight: 700; color: var(--accent); }

        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(74,46,67,0.38); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50;
        }
        .modal-panel {
          background: white; border-radius: 26px; border: 4px solid white; position: relative;
          box-shadow: 0 0 0 4px var(--rarity), 0 24px 50px -20px rgba(74,46,67,0.4);
          width: 100%; max-width: 320px; padding: 30px 22px 24px; text-align: center;
        }
        .modal-glow {
          position: absolute; inset: -20px; z-index: -1; border-radius: 50%;
          background: radial-gradient(circle, var(--rarity) 0%, transparent 70%);
          filter: blur(22px); opacity: 0.55; animation: pulse-glow 2.4s ease-in-out infinite;
        }
        .modal-close { all: unset; position: absolute; top: 14px; right: 14px; color: var(--ink-soft); cursor: pointer; padding: 5px; background: var(--line); border-radius: 50%; z-index: 2; }
        .modal-close:hover { color: var(--ink); }
        .modal-ribbon {
          position: absolute; top: -13px; left: 50%; transform: translateX(-50%) rotate(-2deg);
          background: var(--rarity); color: white; font-size: 10.5px; font-weight: 800;
          padding: 5px 14px; border-radius: 999px; box-shadow: 0 3px 0 rgba(0,0,0,0.1);
          white-space: nowrap; z-index: 2;
        }
        .modal-ribbon.is-UR {
          background: linear-gradient(90deg, #FF6FA0, #FFD766, #5FD9B9, #6FA8FF, #B84DFF, #FF6FA0);
          background-size: 300% 100%; animation: gradient-shift 3s linear infinite;
        }
        .modal-portrait {
          width: 96px; height: 96px; margin: 14px auto 8px; border-radius: 50%;
          background: linear-gradient(155deg, var(--accent), var(--soft) 130%);
          display: flex; align-items: center; justify-content: center;
          font-size: 38px; font-weight: 800; color: white; box-shadow: 0 0 0 5px var(--soft);
          overflow: hidden;
        }
        .modal-portrait-photo { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .modal-panel .rarity-stars { justify-content: center; margin-bottom: 8px; }
        .modal-chip { position: static; display: inline-block; transform: none; margin-bottom: 10px; }
        .modal-name { margin: 0; font-size: 21px; font-weight: 800; }
        .modal-kana { margin: 2px 0 16px; color: var(--ink-soft); font-size: 12.5px; font-weight: 600; }
        .modal-meta { display: flex; justify-content: space-around; background: var(--soft); border-radius: 14px; padding: 12px 0; margin: 0 0 18px; }
        .modal-meta dt { font-size: 10px; color: var(--ink-soft); margin-bottom: 3px; font-weight: 700; }
        .modal-meta dd { margin: 0; font-size: 13px; font-weight: 800; }
        .modal-unmark { all: unset; cursor: pointer; font-size: 12px; font-weight: 700; color: var(--ink-soft); border: 2px solid var(--line); border-radius: 999px; padding: 8px 16px; }
        .modal-unmark:hover { color: var(--ink); border-color: var(--ink-soft); }

        .empty-state { max-width: 780px; margin: 40px auto; text-align: center; color: var(--ink-soft); font-size: 13.5px; font-weight: 600; }
      `}</style>

      <header className="zukan-header">
        <span className="eyebrow"><Star size={11} fill="#FF6FA0" strokeWidth={0} />Collection Zukan · Prototype</span>
        <h1 className="zukan-title">推し 図鑑</h1>
        <p className="zukan-sub">偶像 ・ 演員 ・ コンカフェ嬢 — 依稀有度收藏</p>
        {loading && <p className="zukan-status">連接 Supabase 中…目前顯示範例資料</p>}
        {!loading && loadError && (
          <p className="zukan-status">
            尚未連上 Supabase（{loadError}），目前顯示範例資料。請確認 .env 是否設定正確。
          </p>
        )}
      </header>

      <div className="rarity-board">
        {rarityBreakdown.map(({ rarity, collected, total }) => {
          const rmeta = RARITY_META[rarity];
          return (
            <div key={rarity} className={`rarity-pill tier-${rarity}`} style={{ "--pc": rmeta.color, "--pc-soft": rmeta.soft }}>
              <span className="rarity-pill-label">{rmeta.label}</span>
              <span className="rarity-pill-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={8} fill={i < rmeta.stars ? rmeta.color : "transparent"} stroke={rmeta.color} strokeWidth={1.5} />
                ))}
              </span>
              <span className="rarity-pill-count">{collected}/{total}</span>
            </div>
          );
        })}
      </div>

      <div className="progress-row">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(totalCollected / people.length) * 100}%` }} />
        </div>
        <span className="progress-label">總收藏 {totalCollected}/{people.length}</span>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} />
          <input className="search-input" placeholder="搜尋姓名、假名或所屬" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="type-tabs">
          {["all", "idol", "actor", "concafe"].map((t) => (
            <button
              key={t}
              className={`type-tab ${activeType === t ? "active" : ""}`}
              style={t !== "all" ? { "--tab-accent": TYPE_META[t].accent } : undefined}
              onClick={() => setActiveType(t)}
            >
              {t === "all" ? "全部類型" : TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      <div className="rarity-tabs">
        {["all", ...RARITY_ORDER].map((r) => (
          <button
            key={r}
            className={`type-tab ${activeRarity === r ? "active" : ""}`}
            style={r !== "all" ? { "--tab-accent": RARITY_META[r].color } : undefined}
            onClick={() => setActiveRarity(r)}
          >
            {r === "all" ? "全部稀有度" : RARITY_META[r].label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid">
          {filtered.map((p) => (
            <PersonCard key={p.id} person={p} onToggle={toggleCollected} onOpen={setOpenPerson} />
          ))}
        </div>
      ) : (
        <p className="empty-state">找不到符合條件的人物，換個關鍵字或分類看看。</p>
      )}

      <DetailModal
        person={openPerson}
        onClose={() => setOpenPerson(null)}
        onToggle={(id) => {
          toggleCollected(id);
          setOpenPerson(null);
        }}
      />
    </div>
  );
}
