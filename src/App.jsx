import { useState, useMemo, useEffect } from "react";
import { Search, X, RotateCw } from "lucide-react";
import { supabase } from "./supabaseClient";

// ---------- Mock data ----------
// 真實上線時，圖片建議改用官方釋出的宣傳素材或自製插畫，避免直接盜用寫真照片
const TYPE_META = {
  idol: { label: "偶像", accent: "#FF6FA0", soft: "#FFE1ED" },
  actor: { label: "演員", accent: "#5FD9B9", soft: "#DEFAF1" },
  concafe: { label: "コンカフェ嬢", accent: "#B48CFF", soft: "#ECE1FF" },
};

// 稀有度顏色設定
// solid：一定是單一顏色（用在外框描邊、focus outline、裝飾線條這種不能用漸層的地方）
// bg：實際顯示用的背景，可能是純色，也可能是漸層字串（SSR / UR）
// SR 比較特別，顏色依每個人物的 variant（'gold' 或 'red'）決定，不是固定值
const RARITY_META = {
  N: { label: "N", name: "ノーマル", solid: "#5FC9E8", bg: "#5FC9E8", soft: "#E3F6FC" },
  R: { label: "R", name: "レア", solid: "#FFC93C", bg: "#FFC93C", soft: "#FFF6DA" },
  SR: { label: "SR", name: "スペシャルレア", solid: "#F5A623", soft: "#FFF0DA" },
  SSR: {
    label: "SSR",
    name: "プレミアムレア",
    solid: "#9B4DFF",
    bg: "linear-gradient(135deg, #7B2FF7 0%, #FFD766 50%, #7B2FF7 100%)",
    soft: "#F3E9FF",
  },
  UR: {
    label: "UR",
    name: "アルティメットレア",
    solid: "#B84DFF",
    bg: "conic-gradient(from 0deg, #FF6FA0, #FFD766, #5FD9B9, #6FA8FF, #B84DFF, #FF6FA0)",
    soft: "#F3E6FF",
  },
};
const SR_VARIANT_COLORS = { gold: "#F5A623", red: "#E14C63" };
const RARITY_ORDER = ["N", "R", "SR", "SSR", "UR"];
const GLOW_TIERS = ["SSR", "UR"]; // 這兩階會有發散光暈 + 閃亮效果

function getRarityBg(person) {
  if (person.rarity === "SR") return SR_VARIANT_COLORS[person.variant] || SR_VARIANT_COLORS.gold;
  return RARITY_META[person.rarity].bg;
}
function getRaritySolid(person) {
  if (person.rarity === "SR") return SR_VARIANT_COLORS[person.variant] || SR_VARIANT_COLORS.gold;
  return RARITY_META[person.rarity].solid;
}

const PEOPLE = [
  { id: 1, name: "星野 陽菜", kana: "ホシノ ヒナ", type: "idol", group_name: "Prism*Link", no: "001", rarity: "UR" },
  { id: 2, name: "百合川 澪", kana: "ユリカワ ミオ", type: "idol", group_name: "Prism*Link", no: "002", rarity: "SR", variant: "gold" },
  { id: 3, name: "橘 あかり", kana: "タチバナ アカリ", type: "idol", group_name: "Prism*Link", no: "003", rarity: "R" },
  { id: 4, name: "神楽坂 蓮", kana: "カグラザカ レン", type: "idol", group_name: "月光カラット", no: "004", rarity: "SSR" },
  { id: 5, name: "白瀬 ことね", kana: "シラセ コトネ", type: "idol", group_name: "月光カラット", no: "005", rarity: "N" },
  { id: 6, name: "水無月 玲", kana: "ミナヅキ レイ", type: "actor", group_name: "劇団 灯", no: "006", rarity: "R" },
  { id: 7, name: "朝比奈 蒼", kana: "アサヒナ アオイ", type: "actor", group_name: "劇団 灯", no: "007", rarity: "N" },
  { id: 8, name: "深山 悠人", kana: "ミヤマ ユウト", type: "actor", group_name: "フリー", no: "008", rarity: "N" },
  { id: 9, name: "雪村 りん", kana: "ユキムラ リン", type: "concafe", group_name: "夜想曲", no: "009", rarity: "SSR" },
  { id: 10, name: "花菱 まや", kana: "ハナビシ マヤ", type: "concafe", group_name: "夜想曲", no: "010", rarity: "R" },
  { id: 11, name: "紫藤 のあ", kana: "シドウ ノア", type: "concafe", group_name: "Cafe Lumière", no: "011", rarity: "N" },
  { id: 12, name: "早乙女 楓", kana: "サオトメ カエデ", type: "idol", group_name: "月光カラット", no: "012", rarity: "SR", variant: "red" },
];

function initials(name) {
  return name.slice(0, 1);
}

function RarityHeart({ rarity, variant, size = "sm" }) {
  const rmeta = RARITY_META[rarity];
  const bg = rarity === "SR" ? SR_VARIANT_COLORS[variant] || SR_VARIANT_COLORS.gold : rmeta.bg;
  return (
    <span className={`rarity-heart rarity-heart--${size}`} style={{ "--rarity-bg": bg }} aria-hidden="true">
      <span className="rh-lobe rh-lobe-l" />
      <span className="rh-lobe rh-lobe-r" />
      <span className="rarity-heart-label">{rmeta.label}</span>
    </span>
  );
}

function PersonCard({ person, onOpen }) {
  const meta = TYPE_META[person.type];
  const isGlow = GLOW_TIERS.includes(person.rarity);
  const rbg = getRarityBg(person);
  const rsolid = getRaritySolid(person);
  return (
    <div className="card-slot" style={{ "--accent": meta.accent, "--soft": meta.soft, "--rarity-bg": rbg, "--rarity-solid": rsolid }}>
      <div className={`card-frame rarity-${person.rarity}`}>
        <button className={`candy-card ${isGlow ? "is-glow" : ""}`} onClick={() => onOpen(person)} aria-label={`查看 ${person.name}`}>
          <span className="heart-slot heart-slot--card">
            <RarityHeart rarity={person.rarity} variant={person.variant} size="sm" />
          </span>
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
            <p className="card-name">{person.name}</p>
            <p className="card-kana">{person.kana}</p>
            <span className="type-chip type-chip-inline">{meta.label}</span>
          </div>
          {isGlow && <span className="shine-sweep" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

function DetailModal({ person, onClose }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const meta = TYPE_META[person.type];
  const rmeta = RARITY_META[person.rarity];
  const isGlow = GLOW_TIERS.includes(person.rarity);
  const rbg = getRarityBg(person);
  const rsolid = getRaritySolid(person);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="flip-shell"
        style={{ "--accent": meta.accent, "--soft": meta.soft, "--rarity-bg": rbg, "--rarity-solid": rsolid }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="關閉">
          <X size={16} />
        </button>

        <div className="flip-container" onClick={() => setIsFlipped((f) => !f)} role="button" tabIndex={0} aria-label="點擊翻面">
          <div className={`flip-card ${isFlipped ? "is-flipped" : ""}`}>
            {/* ---------- 正面：大圖 + 稀有度外框 ---------- */}
            <div className={`flip-face flip-front rarity-${person.rarity}`}>
              {isGlow && <span className="modal-glow" aria-hidden="true" />}
              <div className="ornate-frame">
                <div className="frame-photo">
                  {person.photo_url ? (
                    <img className="frame-photo-img" src={person.photo_url} alt="" />
                  ) : (
                    <span className="frame-photo-glyph">{initials(person.name)}</span>
                  )}
                  {isGlow && (
                    <>
                      <span className="sparkle twinkle t1">✦</span>
                      <span className="sparkle twinkle t2">✧</span>
                      <span className="sparkle twinkle t3">✦</span>
                    </>
                  )}
                </div>
                <span className="heart-slot heart-slot--modal">
                  <RarityHeart rarity={person.rarity} variant={person.variant} size="lg" />
                </span>
                <div className="nameplate">
                  <p className="nameplate-name">{person.name}</p>
                  <span className="nameplate-divider">✦</span>
                  <p className="nameplate-group">{person.group_name}</p>
                </div>
                {isGlow && <span className="shine-sweep" aria-hidden="true" />}
              </div>
            </div>

            {/* ---------- 背面：縮圖 + 基本資料 ---------- */}
            <div className="flip-face flip-back">
              <div className="modal-portrait">
                {person.photo_url ? (
                  <img className="modal-portrait-photo" src={person.photo_url} alt="" />
                ) : (
                  <span>{initials(person.name)}</span>
                )}
              </div>
              <span className="rarity-tag static-tag">{rmeta.label}・{rmeta.name}</span>
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
            </div>
          </div>
        </div>

        <p className="flip-hint">
          <RotateCw size={12} /> 點擊卡片翻面
        </p>
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

  const filtered = useMemo(() => {
    return people.filter((p) => {
      const matchesType = activeType === "all" || p.type === activeType;
      const matchesRarity = activeRarity === "all" || p.rarity === activeRarity;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.kana.toLowerCase().includes(q) ||
        (p.group_name || "").toLowerCase().includes(q);
      return matchesType && matchesRarity && matchesQuery;
    });
  }, [people, query, activeType, activeRarity]);

  const rarityBreakdown = RARITY_ORDER.map((r) => ({
    rarity: r,
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

        .rarity-board { max-width: 700px; margin: 22px auto 30px; display: flex; gap: 9px; justify-content: center; flex-wrap: wrap; }
        .rarity-pill {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          background: white; border-radius: 16px; padding: 10px 16px;
          box-shadow: 0 0 0 2px var(--pc-soft), 0 4px 10px -6px rgba(74,46,67,0.3);
          min-width: 56px; position: relative;
        }
        .rarity-pill.tier-SSR { box-shadow: 0 0 0 2px var(--pc), 0 4px 14px -6px rgba(155,77,255,0.5); }
        .rarity-pill.tier-UR { box-shadow: 0 0 0 2px var(--pc), 0 4px 16px -6px rgba(184,77,255,0.55); }
        .rarity-pill-label { font-size: 13px; font-weight: 800; color: var(--pc); letter-spacing: 0.03em; }
        .rarity-pill.tier-SSR .rarity-pill-label,
        .rarity-pill.tier-UR .rarity-pill-label {
          background: linear-gradient(90deg, #FF6FA0, #FFD766, #5FD9B9, #6FA8FF, #B84DFF, #FF6FA0);
          background-size: 300% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: gradient-shift 3s linear infinite;
        }
        .rarity-pill-count { font-size: 11px; font-weight: 700; color: var(--ink-soft); }

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

        .card-frame {
          position: relative; width: 100%; height: 100%; box-sizing: border-box;
          padding: 3px; border-radius: 25px; background: var(--rarity-bg);
        }
        .card-frame.rarity-SSR::before,
        .card-frame.rarity-UR::before {
          content: ""; position: absolute; inset: -16px; z-index: 0; border-radius: 50%;
          filter: blur(16px); animation: pulse-glow 2.4s ease-in-out infinite;
        }
        .card-frame.rarity-SSR::before { background: radial-gradient(circle, #9B4DFF 0%, #FFD766 55%, transparent 78%); opacity: 0.55; }
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
          box-shadow: 6px 8px 0 -1px var(--soft), 0 10px 18px -8px rgba(74,46,67,0.28);
          transition: transform 0.16s ease;
        }
        .candy-card:hover { transform: translateY(-4px) rotate(-1deg); }
        .candy-card:focus-visible { outline: 3px solid var(--rarity-solid); outline-offset: 2px; }
        .candy-card.is-glow { box-shadow: 6px 8px 0 -1px var(--soft), 0 12px 24px -8px var(--rarity-solid); }

        .shine-sweep {
          position: absolute; inset: 0; z-index: 2; pointer-events: none;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.7) 46%, transparent 62%);
          background-size: 250% 250%; animation: shine-sweep 2.6s ease-in-out infinite;
        }
        @keyframes shine-sweep { 0% { background-position: 220% 220%; } 100% { background-position: -40% -40%; } }

        .rarity-tag.static-tag {
          display: inline-block; margin-bottom: 10px; white-space: nowrap;
          background: var(--rarity-bg); color: white; font-size: 10px; font-weight: 800;
          padding: 4px 10px; border-radius: 999px; box-shadow: 0 2px 0 rgba(0,0,0,0.08); letter-spacing: 0.03em;
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

        .card-info { padding: 6px 10px 12px; text-align: center; }
        .card-name { margin: 0; font-size: 13px; font-weight: 800; }
        .card-kana { margin: 1px 0 0; font-size: 10px; color: var(--ink-soft); font-weight: 600; }
        .heart-slot { position: absolute; z-index: 5; }
        .heart-slot--card { top: 6px; left: 6px; }
        .heart-slot--modal { top: 10px; left: 10px; }

        .type-chip {
          display: inline-block;
          font-size: 9.5px; font-weight: 800; background: var(--accent); color: white;
          padding: 3px 10px; border-radius: 999px; white-space: nowrap;
        }
        .type-chip-inline { margin-top: 5px; }

        /* ---------- 彈窗翻牌 ---------- */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(74,46,67,0.4); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50;
        }
        .flip-shell { position: relative; width: 100%; max-width: 320px; }
        .modal-close {
          all: unset; position: absolute; top: -14px; right: -14px; z-index: 10;
          color: var(--ink-soft); cursor: pointer; padding: 7px; background: white;
          border-radius: 50%; box-shadow: 0 3px 10px -3px rgba(74,46,67,0.4);
        }
        .modal-close:hover { color: var(--ink); }

        .flip-container { width: 100%; aspect-ratio: 3 / 4.3; cursor: pointer; perspective: 1400px; }
        .flip-card {
          position: relative; width: 100%; height: 100%;
          transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(.4,.2,.2,1);
        }
        .flip-card.is-flipped { transform: rotateY(180deg); }
        .flip-face {
          position: absolute; inset: 0; backface-visibility: hidden; border-radius: 24px;
          overflow: hidden; background: white;
        }
        .flip-face.flip-back { transform: rotateY(180deg); display: flex; flex-direction: column; align-items: center; padding: 26px 20px 20px; text-align: center; }

        .flip-face.flip-front {
          padding: 5px; box-sizing: border-box; background: var(--rarity-bg);
          box-shadow: 0 20px 40px -16px rgba(74,46,67,0.45);
        }
        .flip-face.flip-front .modal-glow {
          position: absolute; inset: -20px; z-index: -1; border-radius: 50%;
          background: radial-gradient(circle, var(--rarity-solid) 0%, transparent 70%);
          filter: blur(24px); opacity: 0.6; animation: pulse-glow 2.4s ease-in-out infinite;
        }

        .ornate-frame { position: relative; width: 100%; height: 100%; border-radius: 20px; overflow: hidden; background: white; }
        .frame-photo { position: absolute; inset: 0; background: linear-gradient(160deg, var(--accent) 0%, var(--soft) 140%); display: flex; align-items: center; justify-content: center; }
        .frame-photo-img { width: 100%; height: 100%; object-fit: cover; }
        .frame-photo-glyph { font-size: 64px; font-weight: 800; color: white; text-shadow: 0 3px 0 rgba(0,0,0,0.1); }
        .rarity-heart { position: relative; display: block; --hs: 30px; width: var(--hs); height: calc(var(--hs) * 0.9); filter: drop-shadow(0 2px 4px rgba(74,46,67,0.4)); }
        .rarity-heart--sm { --hs: 30px; }
        .rarity-heart--lg { --hs: 52px; }
        .rh-lobe {
          position: absolute; top: 0; width: calc(var(--hs) * 0.52); height: calc(var(--hs) * 0.8);
          background: var(--rarity-bg); border-radius: calc(var(--hs) * 0.5) calc(var(--hs) * 0.5) 0 0;
        }
        .rh-lobe-l { left: 0; transform: rotate(45deg); transform-origin: 100% 100%; }
        .rh-lobe-r { left: calc(var(--hs) * 0.48); transform: rotate(-45deg); transform-origin: 0 100%; }
        .rarity-heart-label {
          position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center;
          padding-top: 8%; color: white; font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .rarity-heart--sm .rarity-heart-label { font-size: 8.5px; }
        .rarity-heart--lg .rarity-heart-label { font-size: 14px; }

        .nameplate {
          position: absolute; left: 0; right: 0; bottom: 0; z-index: 4;
          padding: 22px 16px 14px; text-align: center;
          background: linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 60%, transparent 100%);
        }
        .nameplate-name { margin: 0; color: white; font-size: 18px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.4); }
        .nameplate-divider { display: block; color: var(--rarity-solid); font-size: 9px; margin: 4px auto; opacity: 0.9; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
        .nameplate-group { margin: 0; color: rgba(255,255,255,0.85); font-size: 11.5px; font-weight: 600; }

        .modal-portrait {
          width: 92px; height: 92px; margin: 6px auto 12px; border-radius: 50%; overflow: hidden;
          background: linear-gradient(155deg, var(--accent), var(--soft) 130%);
          display: flex; align-items: center; justify-content: center;
          font-size: 36px; font-weight: 800; color: white; box-shadow: 0 0 0 5px var(--soft);
        }
        .modal-portrait-photo { width: 100%; height: 100%; object-fit: cover; }
        .modal-chip { position: static; display: inline-block; margin-bottom: 10px; }
        .modal-name { margin: 0; font-size: 20px; font-weight: 800; }
        .modal-kana { margin: 2px 0 16px; color: var(--ink-soft); font-size: 12.5px; font-weight: 600; }
        .modal-meta { display: flex; justify-content: space-around; background: var(--soft); border-radius: 14px; padding: 12px 0; margin: 0; width: 100%; box-sizing: border-box; }
        .modal-meta dt { font-size: 10px; color: var(--ink-soft); margin-bottom: 3px; font-weight: 700; }
        .modal-meta dd { margin: 0; font-size: 13px; font-weight: 800; }

        .flip-hint {
          margin: 14px 0 0; text-align: center; font-size: 11.5px; font-weight: 700; color: white;
          display: flex; align-items: center; justify-content: center; gap: 5px; opacity: 0.85;
        }

        .empty-state { max-width: 780px; margin: 40px auto; text-align: center; color: var(--ink-soft); font-size: 13.5px; font-weight: 600; }
      `}</style>

      <header className="zukan-header">
        <span className="eyebrow">✦ Collection Zukan · Prototype</span>
        <h1 className="zukan-title">推し 図鑑</h1>
        <p className="zukan-sub">偶像 ・ 演員 ・ コンカフェ嬢 — 依稀有度分類</p>
        {loading && <p className="zukan-status">連接 Supabase 中…目前顯示範例資料</p>}
        {!loading && loadError && (
          <p className="zukan-status">
            尚未連上 Supabase（{loadError}），目前顯示範例資料。請確認 .env 是否設定正確。
          </p>
        )}
      </header>

      <div className="rarity-board">
        {rarityBreakdown.map(({ rarity, total }) => {
          const rmeta = RARITY_META[rarity];
          return (
            <div key={rarity} className={`rarity-pill tier-${rarity}`} style={{ "--pc": rmeta.solid, "--pc-soft": rmeta.soft }}>
              <span className="rarity-pill-label">{rmeta.label}</span>
              <span className="rarity-pill-count">×{total}</span>
            </div>
          );
        })}
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
            style={r !== "all" ? { "--tab-accent": RARITY_META[r].solid } : undefined}
            onClick={() => setActiveRarity(r)}
          >
            {r === "all" ? "全部稀有度" : RARITY_META[r].label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid">
          {filtered.map((p) => (
            <PersonCard key={p.id} person={p} onOpen={setOpenPerson} />
          ))}
        </div>
      ) : (
        <p className="empty-state">找不到符合條件的人物，換個關鍵字或分類看看。</p>
      )}

      {openPerson && (
        <DetailModal key={openPerson.id} person={openPerson} onClose={() => setOpenPerson(null)} />
      )}
    </div>
  );
}
