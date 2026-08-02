import { useState, useMemo, useEffect } from "react";
import { Search, X, RotateCw } from "lucide-react";
import { supabase } from "./supabaseClient";

// ---------- Mock data ----------
// 真實上線時，圖片建議改用官方釋出的宣傳素材或自製插畫，避免直接盜用寫真照片
const TYPE_META = {
  idol: { label: "偶像", accent: "#FF6FA0", soft: "#FFE1ED" },
  actor: { label: "演員", accent: "#5FD9B9", soft: "#DEFAF1" },
  concafe: { label: "コンカフェ", accent: "#B48CFF", soft: "#ECE1FF" },
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

// 稀有度排序：UR 排最前面，N 排最後面；同稀有度內再依編號排序
const RARITY_RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
function sortByRarityDesc(list) {
  return [...list].sort((a, b) => {
    const diff = (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0);
    if (diff !== 0) return diff;
    return (a.no || "").localeCompare(b.no || "");
  });
}

function getRarityBg(person) {
  if (person.rarity === "SR") return SR_VARIANT_COLORS[person.variant] || SR_VARIANT_COLORS.gold;
  return RARITY_META[person.rarity].bg;
}
function getRaritySolid(person) {
  if (person.rarity === "SR") return SR_VARIANT_COLORS[person.variant] || SR_VARIANT_COLORS.gold;
  return RARITY_META[person.rarity].solid;
}

function getFrameAsset(person) {
  const tier = person.rarity === "SR"
    ? `sr-${person.variant === "red" ? "red" : "gold"}`
    : person.rarity.toLowerCase();
  return `/assets/frames/frame-${tier}.webp`;
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

function RarityBadge({ rarity, variant, size = "sm" }) {
  const rmeta = RARITY_META[rarity];
  const bg = rarity === "SR" ? SR_VARIANT_COLORS[variant] || SR_VARIANT_COLORS.gold : rmeta.bg;
  return (
    <span className={`rarity-badge rarity-badge--${size}`} style={{ "--rarity-bg": bg }} aria-hidden="true">
      <span className="rarity-badge-star">✦</span>
      <span>{rmeta.label}</span>
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
        <img className="card-frame-art" src={getFrameAsset(person)} alt="" draggable="false" />
        <span className="badge-slot badge-slot--card">
          <RarityBadge rarity={person.rarity} variant={person.variant} size="sm" />
        </span>
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
                <img className="modal-frame-art" src={getFrameAsset(person)} alt="" draggable="false" />
                <span className="badge-slot badge-slot--modal">
                  <RarityBadge rarity={person.rarity} variant={person.variant} size="lg" />
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
  const [people, setPeople] = useState(() => sortByRarityDesc(PEOPLE));
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
        setPeople(sortByRarityDesc(data));
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
          --bg: #fff6fb;
          --ink: #56364d;
          --ink-soft: #aa7f9a;
          --line: #f4cfe0;
          --pink: #f65f97;
          --lilac: #a777ef;
          --mint: #55cfae;
          --paper: url('/assets/textures/pearl-ui-surface.webp');
          font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
          background:
            linear-gradient(rgba(255,247,251,.76), rgba(255,247,251,.86)),
            url('/assets/textures/candy-paper-bg.webp') center top / max(100%, 1180px) auto repeat-y,
            var(--bg);
          color: var(--ink);
          min-height: 100vh;
          padding: 34px 20px 72px;
          position: relative;
          overflow-x: hidden;
        }

        .zukan-header { max-width: 980px; margin: 0 auto 8px; text-align: center; position: relative; }
        .eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.16em;
          color: var(--pink); text-transform: uppercase;
          background: var(--paper) center / 210px; padding: 7px 16px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.9);
          box-shadow: 0 0 0 1px var(--line), 0 8px 18px -14px rgba(91,51,79,.8), inset 0 1px 0 white;
        }
        .zukan-title {
          margin: 14px 0 2px; font-size: clamp(34px, 6vw, 48px); font-weight: 900; letter-spacing: 0.04em;
          background: linear-gradient(100deg, #ed4f8a 5%, #a36ee8 52%, #42bfa0 96%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          filter: drop-shadow(0 2px 0 white);
        }
        .zukan-sub { color: var(--ink-soft); font-size: 13px; font-weight: 700; margin: 0; letter-spacing: .02em; }
        .zukan-status { color: var(--lilac); font-size: 11.5px; font-weight: 700; margin: 9px 0 0; }

        .rarity-board {
          max-width: 660px; margin: 24px auto 28px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 9px;
          padding: 10px; border: 1px solid rgba(255,255,255,.92); border-radius: 23px;
          background: var(--paper) center / 300px, rgba(255,255,255,.74);
          box-shadow: 0 0 0 1px rgba(244,207,224,.8), 0 16px 36px -28px rgba(85,45,75,.65), inset 0 1px 0 white;
        }
        .rarity-pill {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          background: linear-gradient(145deg, rgba(255,255,255,.95), var(--pc-soft));
          border: 1px solid white; border-radius: 15px; padding: 9px 8px;
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--pc) 28%, white), 0 5px 12px -9px rgba(74,46,67,.5), inset 0 1px 0 white;
          min-width: 0; position: relative; overflow: hidden;
        }
        .rarity-pill::before { content: "✦"; position: absolute; top: 3px; right: 7px; font-size: 7px; color: var(--pc); opacity: .55; }
        .rarity-pill.tier-SSR { box-shadow: 0 0 0 1px #b777ff, 0 8px 18px -12px rgba(119,48,217,.72), inset 0 1px 0 white; }
        .rarity-pill.tier-UR { box-shadow: 0 0 0 1px #e394d1, 0 8px 20px -12px rgba(184,77,255,.78), inset 0 1px 0 white; }
        .rarity-pill-label { font-size: 13px; font-weight: 900; color: var(--pc); letter-spacing: 0.04em; }
        .rarity-pill.tier-SSR .rarity-pill-label,
        .rarity-pill.tier-UR .rarity-pill-label {
          background: linear-gradient(90deg, #FF6FA0, #FFD766, #5FD9B9, #6FA8FF, #B84DFF, #FF6FA0);
          background-size: 300% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: gradient-shift 3s linear infinite;
        }
        .rarity-pill-count { font-size: 10.5px; font-weight: 800; color: var(--ink-soft); }

        .toolbar { max-width: 820px; margin: 0 auto 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center; }
        .search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 320px; }
        .search-wrap svg { position: absolute; z-index: 1; left: 15px; top: 50%; transform: translateY(-50%); color: var(--pink); }
        .search-input {
          width: 100%; background: var(--paper) center / 260px, white; border: 1px solid white; border-radius: 999px;
          padding: 11px 15px 11px 40px; color: var(--ink); font-size: 13px; font-weight: 700; outline: none; box-sizing: border-box;
          box-shadow: 0 0 0 1px var(--line), 0 8px 20px -15px rgba(74,46,67,.7), inset 0 1px 0 white;
          transition: box-shadow .18s ease, transform .18s ease;
        }
        .search-input:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--pink) 72%, white), 0 10px 22px -15px rgba(246,95,151,.8), inset 0 1px 0 white; transform: translateY(-1px); }
        .search-input::placeholder { color: #D9B9CB; font-weight: 500; }

        .type-tabs, .rarity-tabs { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .rarity-tabs { max-width: 820px; margin: 0 auto 30px; }
        .type-tab {
          border: 1px solid white; background: var(--paper) center / 230px, white; color: var(--ink-soft);
          font-size: 12px; font-weight: 800; padding: 8px 15px; border-radius: 999px;
          box-shadow: 0 0 0 1px var(--line), 0 5px 12px -10px rgba(74,46,67,.6), inset 0 1px 0 white;
          cursor: pointer; transition: transform .14s ease, box-shadow .14s ease, color .14s ease;
        }
        .type-tab:hover { transform: translateY(-2px); color: var(--ink); }
        .type-tab:focus-visible { outline: 3px solid color-mix(in srgb, var(--tab-accent, var(--pink)) 45%, white); outline-offset: 2px; }
        .type-tab.active {
          background: linear-gradient(145deg, color-mix(in srgb, var(--tab-accent, var(--pink)) 82%, white), var(--tab-accent, var(--pink)));
          border-color: rgba(255,255,255,.82); color: white;
          box-shadow: 0 0 0 1px var(--tab-accent, var(--pink)), 0 7px 14px -10px var(--tab-accent, var(--pink)), inset 0 1px 0 rgba(255,255,255,.65);
          text-shadow: 0 1px 2px rgba(85,45,75,.2);
        }

        .grid { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 31px 21px; }
        .card-slot { aspect-ratio: 3 / 4.3; position: relative; }

        .card-frame {
          position: relative; width: 100%; height: 100%; box-sizing: border-box; isolation: isolate;
        }
        .card-frame.rarity-SSR::before,
        .card-frame.rarity-UR::before {
          content: ""; position: absolute; inset: -8%; z-index: -1; border-radius: 34%;
          filter: blur(17px); animation: pulse-glow 2.7s ease-in-out infinite;
        }
        .card-frame.rarity-SSR::before { background: radial-gradient(ellipse, #a84dff 0%, #ffd766 48%, transparent 72%); opacity: .48; }
        .card-frame.rarity-UR::before {
          background: conic-gradient(from 0deg, #FF6FA0, #FFD766, #5FD9B9, #6FA8FF, #B84DFF, #FF6FA0);
          opacity: .46; animation: pulse-glow 2.7s ease-in-out infinite, hue-cycle 5.5s linear infinite;
        }
        @keyframes pulse-glow { 0%,100% { opacity: .28; transform: scale(.94); } 50% { opacity: .62; transform: scale(1.04); } }
        @keyframes hue-cycle { from { filter: blur(17px) hue-rotate(0deg); } to { filter: blur(17px) hue-rotate(360deg); } }
        @keyframes gradient-shift { to { background-position: 300% 0; } }

        .candy-card {
          all: unset; box-sizing: border-box; display: block; cursor: pointer;
          position: absolute; inset: 4.2% 5.3%; z-index: 1;
          background: white; border-radius: 16%; overflow: hidden;
          box-shadow: 0 13px 25px -13px rgba(74,46,67,.62), 0 3px 0 rgba(255,255,255,.8) inset;
          transition: transform .2s cubic-bezier(.2,.7,.2,1), filter .2s ease;
        }
        .card-frame:hover .candy-card { transform: translateY(-5px) rotate(-.8deg) scale(1.015); filter: saturate(1.04); }
        .candy-card:focus-visible { outline: 3px solid var(--rarity-solid); outline-offset: 4px; }
        .candy-card.is-glow { box-shadow: 0 16px 29px -14px var(--rarity-solid), 0 3px 0 rgba(255,255,255,.85) inset; }

        .card-frame-art, .modal-frame-art {
          position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill;
          pointer-events: none; user-select: none; z-index: 5;
        }

        .shine-sweep {
          position: absolute; inset: -20%; z-index: 4; pointer-events: none;
          background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.72) 47%, transparent 59%);
          background-size: 250% 250%; animation: shine-sweep 3.1s ease-in-out infinite;
        }
        @keyframes shine-sweep { 0% { background-position: 220% 220%; } 100% { background-position: -40% -40%; } }

        .rarity-tag.static-tag {
          display: inline-block; margin-bottom: 10px; white-space: nowrap;
          background: var(--rarity-bg); color: white; font-size: 10px; font-weight: 800;
          padding: 4px 10px; border-radius: 999px; box-shadow: 0 2px 0 rgba(0,0,0,0.08); letter-spacing: 0.03em;
        }

        .portrait {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(155deg, var(--accent) 0%, var(--soft) 130%);
          overflow: hidden;
        }
        .portrait::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 54%, rgba(67,30,55,.26) 100%); pointer-events: none; }
        .portrait-glyph { font-size: 40px; font-weight: 900; color: white; text-shadow: 0 3px 0 rgba(0,0,0,.08); }
        .portrait-photo { width: 100%; height: 100%; object-fit: cover; }
        .sparkle { position: absolute; color: white; opacity: 0.85; font-size: 14px; }
        .sparkle-a { top: 12px; left: 14px; }
        .sparkle-b { bottom: 14px; right: 16px; font-size: 11px; }
        .sparkle.twinkle { animation: twinkle 1.6s ease-in-out infinite; }
        .t1 { top: 20%; right: 20%; font-size: 12px; animation-delay: 0s; }
        .t2 { bottom: 30%; left: 18%; font-size: 10px; animation-delay: 0.4s; }
        .t3 { top: 55%; right: 30%; font-size: 9px; animation-delay: 0.8s; }
        @keyframes twinkle { 0%,100% { opacity: 0.2; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.15); } }

        .card-info {
          position: absolute; z-index: 6; left: 10%; right: 10%; bottom: 6%; padding: 7px 7px 8px; text-align: center;
          border: 1px solid rgba(255,255,255,.94); border-radius: 12px;
          background: var(--paper) center / 220px, rgba(255,255,255,.9);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--rarity-solid) 30%, white), 0 5px 12px -8px rgba(74,46,67,.55), inset 0 1px 0 white;
        }
        .card-name { margin: 0; font-size: 13px; font-weight: 900; line-height: 1.2; }
        .card-kana { margin: 2px 0 0; font-size: 8.5px; color: var(--ink-soft); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .badge-slot { position: absolute; z-index: 7; pointer-events: none; }
        .badge-slot--card { top: 8%; left: 8%; }
        .badge-slot--modal { top: 7%; left: 7%; }

        .rarity-badge {
          display: inline-flex; align-items: center; justify-content: center; gap: 3px;
          color: white; background: var(--rarity-bg); border: 1px solid rgba(255,255,255,.9);
          border-radius: 999px; font-weight: 900; letter-spacing: .04em;
          box-shadow: 0 0 0 1px rgba(75,38,64,.2), 0 4px 10px -5px rgba(74,46,67,.7), inset 0 1px 0 rgba(255,255,255,.7);
          text-shadow: 0 1px 2px rgba(58,26,48,.35);
        }
        .rarity-badge--sm { min-width: 29px; padding: 4px 7px; font-size: 9px; }
        .rarity-badge--lg { min-width: 42px; padding: 6px 10px; font-size: 12px; }
        .rarity-badge-star { font-size: .75em; color: #fff7c9; }

        .type-chip {
          display: inline-block;
          font-size: 8px; font-weight: 900; background: var(--accent); color: white;
          padding: 2px 8px; border-radius: 999px; white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.48);
        }
        .type-chip-inline { margin-top: 4px; }

        /* ---------- 彈窗翻牌 ---------- */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(63,31,55,.58); backdrop-filter: blur(8px) saturate(.82);
          display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50;
        }
        .flip-shell { position: relative; width: min(340px, calc((100vh - 105px) * .6977)); max-width: 90vw; }
        .modal-close {
          all: unset; display: grid; place-items: center; position: absolute; top: -13px; right: -13px; z-index: 12;
          color: var(--ink-soft); cursor: pointer; width: 31px; height: 31px; background: var(--paper) center / 180px, white;
          border: 1px solid white; border-radius: 50%; box-shadow: 0 0 0 1px var(--line), 0 7px 15px -7px rgba(50,22,42,.75);
        }
        .modal-close:hover { color: var(--pink); transform: scale(1.05); }
        .modal-close:focus-visible { outline: 3px solid rgba(255,255,255,.7); outline-offset: 3px; }

        .flip-container { width: 100%; aspect-ratio: 3 / 4.3; cursor: pointer; perspective: 1400px; }
        .flip-card {
          position: relative; width: 100%; height: 100%;
          transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(.4,.2,.2,1);
        }
        .flip-card.is-flipped { transform: rotateY(180deg); }
        .flip-face {
          position: absolute; inset: 0; box-sizing: border-box; backface-visibility: hidden; border-radius: 28px;
          background: white;
        }
        .flip-face.flip-back {
          transform: rotateY(180deg); display: flex; flex-direction: column; align-items: center; padding: 30px 23px 22px; text-align: center; overflow: hidden;
          background: var(--paper) center / 320px, white; border: 1px solid rgba(255,255,255,.96);
          box-shadow: 0 0 0 3px var(--rarity-solid), 0 0 0 7px white, 0 22px 42px -18px rgba(42,16,34,.65);
        }
        .flip-face.flip-back::before {
          content: ""; position: absolute; inset: 10px; border: 1px dashed color-mix(in srgb, var(--rarity-solid) 44%, white); border-radius: 20px; pointer-events: none;
        }

        .flip-face.flip-front {
          background: transparent; overflow: visible;
          filter: drop-shadow(0 19px 18px rgba(42,16,34,.36));
        }
        .flip-face.flip-front .modal-glow {
          position: absolute; inset: -10%; z-index: -1; border-radius: 38%;
          background: radial-gradient(circle, var(--rarity-solid) 0%, transparent 70%);
          filter: blur(27px); opacity: .52; animation: pulse-glow 2.7s ease-in-out infinite;
        }

        .ornate-frame { position: relative; width: 100%; height: 100%; border-radius: 26px; }
        .frame-photo { position: absolute; inset: 4.2% 5.3%; border-radius: 16%; overflow: hidden; background: linear-gradient(160deg, var(--accent) 0%, var(--soft) 140%); display: flex; align-items: center; justify-content: center; }
        .frame-photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 58%, rgba(44,17,35,.4)); pointer-events: none; }
        .frame-photo-img { width: 100%; height: 100%; object-fit: cover; }
        .frame-photo-glyph { font-size: 64px; font-weight: 800; color: white; text-shadow: 0 3px 0 rgba(0,0,0,0.1); }

        .nameplate {
          position: absolute; left: 11%; right: 11%; bottom: 7%; z-index: 6;
          padding: 11px 14px 10px; text-align: center; border: 1px solid rgba(255,255,255,.9); border-radius: 14px;
          background: var(--paper) center / 250px, rgba(255,255,255,.91);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--rarity-solid) 32%, white), 0 8px 18px -11px rgba(51,20,41,.75), inset 0 1px 0 white;
        }
        .nameplate-name { margin: 0; color: var(--ink); font-size: 18px; font-weight: 900; }
        .nameplate-divider { display: block; color: var(--rarity-solid); font-size: 8px; margin: 3px auto; }
        .nameplate-group { margin: 0; color: var(--ink-soft); font-size: 10.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .modal-portrait {
          position: relative; width: 94px; height: 94px; margin: 7px auto 14px; border-radius: 50%; overflow: hidden;
          background: linear-gradient(155deg, var(--accent), var(--soft) 130%);
          display: flex; align-items: center; justify-content: center;
          font-size: 36px; font-weight: 900; color: white;
          box-shadow: 0 0 0 4px white, 0 0 0 6px var(--rarity-solid), 0 9px 18px -12px rgba(74,46,67,.8);
        }
        .modal-portrait-photo { width: 100%; height: 100%; object-fit: cover; }
        .modal-chip { position: static; display: inline-block; margin-bottom: 10px; }
        .modal-name { margin: 0; font-size: 20px; font-weight: 900; }
        .modal-kana { margin: 2px 0 16px; color: var(--ink-soft); font-size: 12.5px; font-weight: 600; }
        .modal-meta { display: flex; justify-content: space-around; background: color-mix(in srgb, var(--soft) 74%, white); border: 1px solid white; border-radius: 16px; padding: 13px 0; margin: 0; width: 100%; box-sizing: border-box; box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, white), inset 0 1px 0 white; }
        .modal-meta dt { font-size: 10px; color: var(--ink-soft); margin-bottom: 3px; font-weight: 700; }
        .modal-meta dd { margin: 0; font-size: 13px; font-weight: 900; }

        .flip-hint {
          margin: 14px 0 0; text-align: center; font-size: 11.5px; font-weight: 700; color: white;
          display: flex; align-items: center; justify-content: center; gap: 5px; opacity: .9;
          text-shadow: 0 2px 6px rgba(38,15,31,.6);
        }

        .empty-state { max-width: 780px; margin: 40px auto; padding: 25px; text-align: center; color: var(--ink-soft); font-size: 13.5px; font-weight: 700; background: var(--paper) center / 280px, rgba(255,255,255,.78); border: 1px solid white; border-radius: 22px; box-shadow: 0 0 0 1px var(--line); }

        @media (max-width: 720px) {
          .zukan-root { padding: 24px 13px 50px; }
          .rarity-board { margin: 20px auto 23px; gap: 6px; padding: 7px; border-radius: 19px; }
          .rarity-pill { padding: 8px 3px; border-radius: 12px; }
          .rarity-pill::before { display: none; }
          .toolbar { flex-direction: column; align-items: stretch; }
          .search-wrap { max-width: none; width: 100%; }
          .type-tabs { gap: 6px; }
          .type-tabs .type-tab { flex: 1; padding-inline: 8px; }
          .rarity-tabs { flex-wrap: nowrap; justify-content: flex-start; overflow-x: auto; padding: 3px 2px 10px; margin-bottom: 22px; scrollbar-width: none; }
          .rarity-tabs::-webkit-scrollbar { display: none; }
          .rarity-tabs .type-tab { flex: 0 0 auto; }
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 25px 12px; }
        }

        @media (max-width: 390px) {
          .zukan-root { padding-inline: 10px; }
          .zukan-title { font-size: 34px; }
          .zukan-sub { font-size: 11.5px; }
          .rarity-pill-label { font-size: 11.5px; }
          .rarity-pill-count { font-size: 9.5px; }
          .card-name { font-size: 11.5px; }
          .card-kana { font-size: 7.5px; }
          .type-chip { font-size: 7px; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
        }
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
