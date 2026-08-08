import { useState, useMemo, useEffect } from "react";
import { Search, X, RotateCw } from "lucide-react";
import { supabase } from "./supabaseClient";

// ---------- Mock data ----------
// 真實上線時，圖片建議改用官方釋出的宣傳素材或自製插畫，避免直接盜用寫真照片
const TYPE_META = {
  idol: { label: "偶像", shortLabel: "偶像", accent: "#FF6FA0", soft: "#FFE1ED" },
  actor: { label: "演員", shortLabel: "演員", accent: "#5FD9B9", soft: "#DEFAF1" },
  concafe: { label: "コンカフェ", shortLabel: "コンカフェ", accent: "#B48CFF", soft: "#ECE1FF" },
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

function getFrameTier(person) {
  return person.rarity === "SR"
    ? `sr-${person.variant === "red" ? "red" : "gold"}`
    : person.rarity.toLowerCase();
}

function getFrameAsset(person) {
  const tier = getFrameTier(person);
  return `/assets/frames/frame-${tier}.webp`;
}

function getRarityStickerAsset(rarity, variant) {
  const tier = rarity === "SR"
    ? `sr-${variant === "red" ? "red" : "gold"}`
    : rarity.toLowerCase();
  return `/assets/rarity/rarity-${tier}.png`;
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
  const solid = rarity === "SR" ? SR_VARIANT_COLORS[variant] || SR_VARIANT_COLORS.gold : rmeta.solid;
  const starCount = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 }[rarity] ?? 0;
  const [assetFailed, setAssetFailed] = useState(false);
  return (
    <span
      className={`rarity-badge rarity-badge--${size} rarity-badge--${rarity.toLowerCase()} ${rarity === "SR" ? `rarity-badge--sr-${variant === "red" ? "red" : "gold"}` : ""}`}
      style={{ "--rarity-bg": bg, "--badge-solid": solid }}
      aria-hidden="true"
    >
      {!assetFailed ? (
        <img
          className="rarity-badge-art"
          src={getRarityStickerAsset(rarity, variant)}
          alt=""
          draggable="false"
          onError={() => setAssetFailed(true)}
        />
      ) : (
        <span className="rarity-badge-fallback">
          <span>{rmeta.label}</span>
          {starCount > 0 && (
            <span className="rarity-badge-fallback-stars">
              {Array.from({ length: starCount }, (_, index) => <span key={index}>☆</span>)}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

function TypeSticker({ type, size = "sm" }) {
  const meta = TYPE_META[type];
  return (
    <span className={`type-sticker type-sticker--${size}`} aria-hidden="true">
      <span>{size === "sm" ? meta.shortLabel : meta.label}</span>
    </span>
  );
}

function PersonCard({ person, onOpen, animationIndex = 0 }) {
  const meta = TYPE_META[person.type];
  const isGlow = GLOW_TIERS.includes(person.rarity);
  const rbg = getRarityBg(person);
  const rsolid = getRaritySolid(person);
  return (
    <div
      className="card-slot"
      style={{
        "--accent": meta.accent,
        "--soft": meta.soft,
        "--rarity-bg": rbg,
        "--rarity-solid": rsolid,
        "--shine-delay": `${animationIndex * 0.16}s`,
      }}
    >
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
          </div>
          {isGlow && <span className="shine-sweep" aria-hidden="true" />}
        </button>
        <img className="card-frame-art" src={getFrameAsset(person)} alt="" draggable="false" />
        <span className="badge-slot badge-slot--card">
          <RarityBadge rarity={person.rarity} variant={person.variant} size="sm" />
        </span>
        <span className="type-slot type-slot--card">
          <TypeSticker type={person.type} size="sm" />
        </span>
      </div>
    </div>
  );
}

function DetailModal({ person, onClose }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const meta = TYPE_META[person.type];
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
                <span className="type-slot type-slot--modal">
                  <TypeSticker type={person.type} size="lg" />
                </span>
                <div className="nameplate">
                  <p className="nameplate-name">{person.name}</p>
                  <span className="nameplate-divider">✦</span>
                  <p className="nameplate-kana">{person.kana}</p>
                </div>
                {isGlow && <span className="shine-sweep" aria-hidden="true" />}
              </div>
            </div>

            {/* ---------- 背面：收藏卡人物資料頁 ---------- */}
            <div className="flip-face flip-back">
              <header className="profile-card-header">
                <div className="profile-card-heading">
                  <span className="profile-card-kicker">OSHI ZUKAN / PROFILE CARD</span>
                  <RarityBadge rarity={person.rarity} variant={person.variant} size="lg" />
                </div>
                <span className="profile-card-number" aria-label={`圖鑑編號 ${person.no}`}>
                  <small>COLLECTION No.</small>
                  <strong>{person.no}</strong>
                </span>
              </header>

              <div className="profile-card-main">
                <div className="profile-polaroid" aria-hidden="true">
                  <span className="profile-tape" />
                  <div className="profile-polaroid-photo">
                    {person.photo_url ? (
                      <img className="profile-polaroid-img" src={person.photo_url} alt="" />
                    ) : (
                      <span>{initials(person.name)}</span>
                    )}
                  </div>
                  <span className="profile-polaroid-caption">MY OSHI ♡</span>
                </div>

                <div className="profile-identity">
                  <span className="profile-label">PROFILE</span>
                  <h2 className={`modal-name ${[...person.name].length >= 5 ? "is-long" : ""}`}>{person.name}</h2>
                  <p className="modal-kana">{person.kana}</p>
                  <span className="profile-name-underline" aria-hidden="true" />
                  <TypeSticker type={person.type} size="lg" />
                </div>
              </div>

              <div className="profile-affiliation">
                <span className="profile-affiliation-label">所属 / GROUP</span>
                <strong>{person.group_name}</strong>
                <span className="profile-affiliation-heart" aria-hidden="true">♡</span>
              </div>

              <footer className="profile-card-footer" aria-hidden="true">
                <span>MY OSHI COLLECTION</span>
                <span>✦ {meta.shortLabel} ✦</span>
              </footer>
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
  // 載入完成前保持空資料，避免範例卡先掛載而讓動畫提早起跑
  const [people, setPeople] = useState([]);
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
        setPeople(sortByRarityDesc(PEOPLE));
      } else if (data && data.length > 0) {
        setPeople(sortByRarityDesc(data));
      } else {
        setPeople(sortByRarityDesc(PEOPLE));
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
          --card-ratio: 3 / 4.3;
          --photo-window-inset: 5.3%;
          --photo-position: 50% 50%;
          --font-title: "Yomogi", cursive;
          --font-card-name: "Hachi Maru Pop", cursive;
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
          margin: 14px 0 2px; font-family: var(--font-title); font-size: clamp(34px, 6vw, 48px); font-weight: 700; letter-spacing: 0.04em;
          background: linear-gradient(100deg, #ed4f8a 5%, #a36ee8 52%, #42bfa0 96%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          filter: drop-shadow(0 2px 0 white);
        }
        .zukan-sub { color: var(--ink-soft); font-family: var(--font-title); font-size: 13px; font-weight: 700; margin: 0; letter-spacing: .02em; }
        .zukan-status { color: var(--lilac); font-family: var(--font-title); font-size: 11.5px; font-weight: 700; margin: 9px 0 0; }

        .rarity-board {
          max-width: 700px; margin: 29px auto 30px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
          font-family: var(--font-title);
          padding: 17px 10px 10px; border: 1px solid rgba(255,255,255,.96); border-radius: 22px;
          background:
            linear-gradient(105deg, rgba(255,255,255,.9), rgba(255,243,250,.7)),
            var(--paper) center / 300px;
          box-shadow: 0 0 0 1.5px rgba(244,189,216,.78), 0 14px 28px -23px rgba(85,45,75,.7), inset 0 1px 0 white;
          position: relative;
        }
        .rarity-board::before {
          content: "COLLECTION STATUS"; position: absolute; left: 24px; top: -9px;
          padding: 2px 10px 3px; border: 1px solid #f3c7dc; border-radius: 999px;
          background: #fffafc; color: #d77aa5; font-size: 8px; font-weight: 900;
          letter-spacing: .14em; line-height: 1.2; box-shadow: 0 2px 7px rgba(126,72,105,.09);
        }
        .rarity-board::after {
          content: "♡"; position: absolute; right: 22px; top: -10px; padding: 0 5px;
          background: #fffafc; color: #ee8fb8; font-size: 13px; line-height: 17px;
        }
        .rarity-pill {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          background:
            linear-gradient(155deg, rgba(255,255,255,.98) 0 48%, color-mix(in srgb, var(--pc-soft) 82%, white) 100%);
          border: 1px solid white; border-radius: 11px 11px 14px 14px; padding: 10px 8px 9px;
          box-shadow:
            0 0 0 1px color-mix(in srgb, var(--pc) 36%, white),
            0 3px 0 color-mix(in srgb, var(--pc) 22%, white),
            0 7px 12px -10px rgba(74,46,67,.5), inset 0 1px 0 white;
          min-width: 0; position: relative; overflow: hidden;
        }
        .rarity-pill::before {
          content: "✦"; position: absolute; top: 4px; right: 6px; width: 12px; height: 12px;
          display: grid; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--pc-soft) 68%, white);
          color: var(--pc); font-size: 6px; opacity: .82; transform: rotate(8deg);
        }
        .rarity-pill::after {
          content: ""; position: absolute; left: 10px; right: 10px; bottom: 4px; height: 1px;
          background: repeating-linear-gradient(90deg, var(--pc) 0 4px, transparent 4px 7px); opacity: .28;
        }
        .rarity-pill.tier-SSR { box-shadow: 0 0 0 1px #c59cff, 0 3px 0 #e4d2ff, 0 8px 16px -12px rgba(119,48,217,.58), inset 0 1px 0 white; }
        .rarity-pill.tier-UR { box-shadow: 0 0 0 1px #e7a6d7, 0 3px 0 #f7d4eb, 0 8px 17px -12px rgba(184,77,255,.6), inset 0 1px 0 white; }
        .rarity-pill-label { font-size: 13px; font-weight: 900; color: var(--pc); letter-spacing: 0.04em; }
        .rarity-pill.tier-SSR .rarity-pill-label,
        .rarity-pill.tier-UR .rarity-pill-label {
          background: linear-gradient(90deg, #FF6FA0, #FFD766, #5FD9B9, #6FA8FF, #B84DFF, #FF6FA0);
          background-size: 300% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: gradient-shift 3s linear infinite;
        }
        .rarity-pill-count { font-size: 10.5px; font-weight: 800; color: var(--ink-soft); }

        .toolbar { max-width: 820px; margin: 0 auto 15px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: center; font-family: var(--font-title); }
        .search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 320px; }
        .search-wrap::after {
          content: "SEARCH"; position: absolute; z-index: 2; left: 18px; top: -7px;
          padding: 1px 7px; border-radius: 999px; background: #fffafd; border: 1px solid #f3cade;
          color: #df7fa9; font-size: 7px; font-weight: 900; letter-spacing: .13em; line-height: 12px;
        }
        .search-wrap svg { position: absolute; z-index: 1; left: 15px; top: 50%; transform: translateY(-50%); color: var(--pink); }
        .search-input {
          width: 100%; background: var(--paper) center / 260px, white; border: 1px solid white; border-radius: 14px;
          padding: 12px 15px 10px 40px; color: var(--ink); font-family: var(--font-title); font-size: 13px; font-weight: 700; outline: none; box-sizing: border-box;
          box-shadow: 0 0 0 1.5px var(--line), 0 3px 0 #f8dce9, 0 8px 18px -15px rgba(74,46,67,.68), inset 0 1px 0 white;
          transition: box-shadow .18s ease, transform .18s ease;
        }
        .search-input:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--pink) 62%, white), 0 3px 0 #f6c6da, 0 10px 22px -15px rgba(246,95,151,.74), inset 0 1px 0 white; transform: translateY(-1px); }
        .search-input::placeholder { color: #D9B9CB; font-weight: 500; }

        .type-tabs, .rarity-tabs { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .rarity-tabs { max-width: 820px; margin: 0 auto 32px; font-family: var(--font-title); }
        .type-tab {
          min-height: 36px; border: 1px solid white;
          background:
            linear-gradient(155deg, rgba(255,255,255,.98) 0 58%, rgba(255,240,248,.9) 100%),
            var(--paper) center / 230px;
          color: var(--ink-soft); font-family: var(--font-title); font-size: 12px; font-weight: 850; letter-spacing: .015em;
          padding: 8px 16px 8px 30px; border-radius: 11px 11px 13px 13px;
          box-shadow: 0 0 0 1px var(--line), 0 3px 0 #f5d7e5, 0 7px 12px -10px rgba(74,46,67,.62), inset 0 1px 0 white;
          cursor: pointer; position: relative; isolation: isolate; overflow: hidden;
          transition: transform .14s cubic-bezier(.2,.8,.2,1), box-shadow .14s ease, color .14s ease, filter .14s ease;
        }
        .type-tab::before {
          content: "✦"; position: absolute; left: 10px; top: 50%; transform: translateY(-50%) rotate(-8deg);
          width: 14px; height: 14px; display: grid; place-items: center; border-radius: 5px;
          background: color-mix(in srgb, var(--tab-accent, var(--pink)) 13%, white);
          border: 1px solid color-mix(in srgb, var(--tab-accent, var(--pink)) 34%, white);
          color: var(--tab-accent, var(--pink)); font-size: 7px; line-height: 1;
        }
        .type-tab::after {
          content: ""; position: absolute; z-index: -1; left: 12%; right: 12%; top: 3px; height: 1px;
          background: rgba(255,255,255,.9); border-radius: 999px;
        }
        .type-tab:hover { transform: translateY(-2px) rotate(-.35deg); color: var(--ink); filter: saturate(1.04); }
        .type-tab:active { transform: translateY(1px) scale(.98); box-shadow: 0 0 0 1px var(--line), 0 1px 0 #f5d7e5, inset 0 1px 2px rgba(91,51,79,.08); }
        .type-tab:focus-visible { outline: 3px solid color-mix(in srgb, var(--tab-accent, var(--pink)) 45%, white); outline-offset: 2px; }
        .type-tab.active {
          background:
            linear-gradient(155deg, color-mix(in srgb, var(--tab-accent, var(--pink)) 70%, white) 0 48%, var(--tab-accent, var(--pink)) 100%);
          border-color: rgba(255,255,255,.82); color: white;
          box-shadow: 0 0 0 1px var(--tab-accent, var(--pink)), 0 3px 0 color-mix(in srgb, var(--tab-accent, var(--pink)) 72%, #8b4268), 0 9px 16px -11px var(--tab-accent, var(--pink)), inset 0 1px 0 rgba(255,255,255,.72);
          text-shadow: 0 1px 2px rgba(85,45,75,.2);
        }
        .type-tab.active::before {
          background: rgba(255,255,255,.88); border-color: white; color: var(--tab-accent, var(--pink));
          box-shadow: 0 1px 4px rgba(76,39,64,.14); transform: translateY(-50%) rotate(8deg) scale(1.04);
        }

        .grid { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 31px 21px; }
        .card-slot { aspect-ratio: var(--card-ratio); position: relative; }

        .card-frame {
          position: relative; width: 100%; height: 100%; box-sizing: border-box; isolation: isolate;
          transition: transform .2s cubic-bezier(.2,.7,.2,1), filter .2s ease;
        }
        .card-frame:is(:hover, :focus-within) {
          z-index: 2; transform: translateY(-5px) rotate(-.8deg) scale(1.015); filter: saturate(1.04);
        }
        .card-frame.rarity-SSR::before,
        .card-frame.rarity-UR::before {
          content: ""; position: absolute; inset: -5%; z-index: -1; border-radius: 34%;
          filter: blur(23px); animation: pulse-glow 2.7s ease-in-out infinite;
          pointer-events: none; will-change: opacity, transform;
        }
        .card-frame.rarity-SSR::before {
          --glow-low: .12; --glow-high: .26;
          background: radial-gradient(ellipse, rgba(168,77,255,.86) 0%, rgba(255,215,102,.5) 42%, transparent 70%);
        }
        .card-frame.rarity-UR::before {
          --glow-low: .11; --glow-high: .24;
          background: conic-gradient(from 0deg, rgba(255,111,160,.76), rgba(255,215,102,.72), rgba(95,217,185,.7), rgba(111,168,255,.72), rgba(184,77,255,.76), rgba(255,111,160,.76));
          animation: pulse-glow 2.7s ease-in-out infinite, hue-cycle 5.5s linear infinite;
        }
        @keyframes pulse-glow { 0%,100% { opacity: var(--glow-low, .12); transform: scale(.98); } 50% { opacity: var(--glow-high, .26); transform: scale(1.045); } }
        @keyframes hue-cycle { from { filter: blur(23px) hue-rotate(0deg); } to { filter: blur(23px) hue-rotate(360deg); } }
        @keyframes gradient-shift { to { background-position: 300% 0; } }

        .candy-card {
          all: unset; box-sizing: border-box; display: block; cursor: pointer;
          position: absolute; inset: var(--photo-window-inset); z-index: 1;
          background: white; border-radius: 16%; overflow: hidden;
          box-shadow: 0 13px 25px -13px rgba(74,46,67,.62), 0 3px 0 rgba(255,255,255,.8) inset;
        }
        .candy-card:focus-visible { outline: 3px solid var(--rarity-solid); outline-offset: 4px; }
        .candy-card.is-glow { box-shadow: 0 14px 27px -19px rgba(50,22,42,.52), 0 3px 0 rgba(255,255,255,.85) inset; }

        .card-frame-art, .modal-frame-art {
          position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill;
          pointer-events: none; user-select: none; z-index: 5;
        }

        .shine-sweep {
          position: absolute; inset: 0; z-index: 4; pointer-events: none; overflow: hidden;
          background: linear-gradient(112deg, transparent 33%, rgba(255,255,255,.08) 40%, rgba(255,255,255,.5) 48%, rgba(255,232,250,.2) 54%, transparent 64%);
          background-size: 280% 100%; background-position: 180% 0;
          opacity: 0; mix-blend-mode: screen;
          animation: pearl-sweep 7.2s cubic-bezier(.38,.02,.28,1) var(--shine-delay, 0s) infinite;
        }
        .rarity-SSR .shine-sweep {
          background-image: linear-gradient(112deg, transparent 34%, rgba(231,203,255,.08) 40%, rgba(255,255,255,.52) 48%, rgba(255,218,245,.24) 55%, transparent 64%);
        }
        .rarity-UR .shine-sweep {
          background-image: linear-gradient(112deg, transparent 31%, rgba(255,177,216,.06) 38%, rgba(255,245,185,.3) 44%, rgba(219,255,247,.48) 49%, rgba(211,224,255,.3) 54%, rgba(244,210,255,.12) 59%, transparent 68%);
        }
        .ornate-frame > .shine-sweep {
          inset: var(--photo-window-inset); border-radius: 16%; overflow: hidden;
        }
        @keyframes pearl-sweep {
          0%, 42% { background-position: 180% 0; opacity: 0; }
          48% { opacity: .12; }
          62% { opacity: .62; }
          78% { background-position: -80% 0; opacity: .16; }
          82%, 100% { background-position: -80% 0; opacity: 0; }
        }

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
        .portrait-photo, .frame-photo-img {
          width: 100%; height: 100%; object-fit: cover; object-position: var(--photo-position);
        }
        .sparkle { position: absolute; color: white; opacity: 0.85; font-size: 14px; }
        .sparkle-a { top: 12px; left: 14px; }
        .sparkle-b { bottom: 14px; right: 16px; font-size: 11px; }
        .sparkle.twinkle {
          opacity: 0; transform-origin: center;
          filter: drop-shadow(0 0 3px rgba(255,255,255,.75));
          animation: twinkle-pop 5.4s ease-in-out infinite;
        }
        .t1 { top: 20%; right: 20%; font-size: 12px; animation-delay: 0s; }
        .t2 { bottom: 31%; left: 17%; font-size: 10px; animation-delay: 1.8s; }
        .t3 { top: 54%; right: 27%; font-size: 9px; animation-delay: 3.55s; }
        .rarity-SSR .sparkle.twinkle { color: #fff8ff; }
        .rarity-UR .sparkle.twinkle { animation-duration: 6.2s; filter: drop-shadow(0 0 4px rgba(255,236,192,.82)); }
        @keyframes twinkle-pop {
          0%, 56%, 100% { opacity: 0; transform: scale(.38) rotate(-18deg); }
          62% { opacity: .96; transform: scale(1.18) rotate(5deg); }
          68% { opacity: .32; transform: scale(.86) rotate(16deg); }
          72% { opacity: 0; transform: scale(.48) rotate(25deg); }
        }

        .loading-grid { pointer-events: none; }
        .loading-card {
          aspect-ratio: var(--card-ratio); border-radius: 12%; position: relative; overflow: hidden;
          border: 1px solid rgba(244,207,224,.92);
          background: linear-gradient(145deg, rgba(255,255,255,.94), rgba(255,241,248,.88));
          box-shadow: 0 12px 26px -22px rgba(74,46,67,.5), inset 0 0 0 7px rgba(255,255,255,.56);
        }
        .loading-card::before {
          content: ""; position: absolute; inset: 6% 7% 24%; border-radius: 14%;
          background: linear-gradient(105deg, #f8eaf1 20%, #fffafd 43%, #f3e3ed 66%);
          background-size: 220% 100%; animation: loading-pearl 1.7s ease-in-out infinite;
        }
        .loading-card::after {
          content: ""; position: absolute; left: 12%; right: 12%; bottom: 8%; height: 10%;
          border-radius: 8px; background: rgba(247,225,236,.88);
          box-shadow: 0 -12px 0 -3px rgba(250,234,242,.76);
        }
        @keyframes loading-pearl { from { background-position: 145% 0; } to { background-position: -85% 0; } }

        .card-info {
          position: absolute; z-index: 6; left: 7.5%; right: 7.5%; bottom: 4.9%;
          min-height: 21%; box-sizing: border-box; padding: 10px 11px 9px; text-align: center;
          border: 1px solid rgba(255,255,255,.96); border-top-color: color-mix(in srgb, var(--rarity-solid) 32%, white);
          border-radius: 5px 5px 14px 13px / 4px 4px 12px 11px;
          background:
            linear-gradient(174deg, rgba(255,255,255,.98), rgba(255,251,253,.94)),
            var(--paper) center / 220px;
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--rarity-solid) 20%, white), 0 8px 14px -10px rgba(74,46,67,.58), inset 0 1px 0 white;
          clip-path: polygon(0 5%, 3% 1%, 49% 0, 97% 1%, 100% 6%, 99% 97%, 96% 100%, 4% 99%, 1% 96%);
        }
        .card-info::before {
          content: ""; position: absolute; left: 13%; right: 13%; top: 4px; height: 1px;
          background: repeating-linear-gradient(90deg, var(--rarity-solid) 0 5px, transparent 5px 9px); opacity: .28;
        }
        .card-info::after {
          content: "♡"; position: absolute; left: 9px; bottom: 7px;
          color: color-mix(in srgb, var(--rarity-solid) 58%, #ef79ab); font-size: 8px; transform: rotate(-9deg);
        }
        .card-name { margin: 2px 0 0; font-size: 13px; font-weight: 900; line-height: 1.2; letter-spacing: .035em; }
        .card-kana { margin: 3px 0 0; padding: 0 12px; font-size: 8.2px; color: var(--ink-soft); font-weight: 700; letter-spacing: .045em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .badge-slot, .type-slot { position: absolute; z-index: 7; pointer-events: none; }
        .badge-slot--card { top: 5.6%; left: 5.8%; transform: rotate(-3deg); }
        .badge-slot--modal { top: 5.2%; left: 5.4%; transform: rotate(-3.5deg); }
        .type-slot--card { top: 7.4%; right: 7.2%; max-width: 45%; transform: rotate(2deg); }
        .type-slot--modal { top: 6.8%; right: 6.7%; max-width: 44%; transform: rotate(2.5deg); }

        .rarity-badge {
          --badge-sm-width: 34px; --badge-lg-width: 57px;
          position: relative; isolation: isolate; overflow: visible; display: block; line-height: 0;
        }
        .rarity-badge--sm { width: var(--badge-sm-width); }
        .rarity-badge--lg { width: var(--badge-lg-width); }
        .rarity-badge--n { --badge-sm-width: 29px; --badge-lg-width: 49px; }
        .rarity-badge--r { --badge-sm-width: 33px; --badge-lg-width: 55px; }
        .rarity-badge--sr { --badge-sm-width: 45px; --badge-lg-width: 76px; }
        .rarity-badge--ssr { --badge-sm-width: 53px; --badge-lg-width: 90px; }
        .rarity-badge--ur { --badge-sm-width: 61px; --badge-lg-width: 104px; }
        .rarity-badge-art { display: block; width: 100%; height: auto; user-select: none; filter: drop-shadow(0 2px 1px rgba(74,46,67,.2)); }
        .rarity-badge--ssr::after {
          content: ""; position: absolute; z-index: 1; inset: 0;
          background: linear-gradient(108deg, transparent 34%, rgba(255,255,255,.9) 49%, transparent 64%);
          background-size: 260% 100%; background-position: 155% 0; opacity: 0;
          -webkit-mask: url('/assets/rarity/rarity-ssr.png') center / contain no-repeat;
          mask: url('/assets/rarity/rarity-ssr.png') center / contain no-repeat;
          animation: badge-glint 7.2s ease-in-out var(--shine-delay, 0s) infinite;
        }
        @keyframes badge-glint {
          0%, 62%, 100% { background-position: 155% 0; opacity: 0; }
          68% { opacity: .8; }
          76% { background-position: -70% 0; opacity: 0; }
        }
        .rarity-badge--ur .rarity-badge-art { animation: ur-sticker-breathe 7.2s ease-in-out var(--shine-delay, 0s) infinite; }
        @keyframes ur-sticker-breathe {
          0%, 100% { filter: drop-shadow(0 2px 1px rgba(74,46,67,.2)) drop-shadow(0 0 0 rgba(173,117,255,0)); }
          50% { filter: saturate(1.1) brightness(1.045) drop-shadow(0 2px 1px rgba(74,46,67,.2)) drop-shadow(0 0 5px rgba(173,117,255,.34)); }
        }
        .rarity-badge-fallback {
          display: inline-flex; align-items: center; justify-content: center; gap: 2px; min-width: 100%; box-sizing: border-box;
          padding: 4px 6px; border: 1.5px solid var(--badge-solid); border-radius: 48% 52% 46% 54% / 55% 45% 58% 42%;
          background: rgba(255,255,255,.96); color: color-mix(in srgb, var(--badge-solid) 82%, #54253f);
          font-size: 9px; font-weight: 950; line-height: 1; letter-spacing: .03em; box-shadow: 0 0 0 2px white;
        }
        .rarity-badge--lg .rarity-badge-fallback { padding: 7px 9px; font-size: 13px; }
        .rarity-badge-fallback-stars { display: inline-flex; gap: 1px; font-size: .62em; letter-spacing: -.12em; }

        .type-sticker {
          position: relative; display: inline-flex; align-items: center; justify-content: center;
          box-sizing: border-box; max-width: 100%; color: color-mix(in srgb, var(--accent) 72%, #54253f);
          background: linear-gradient(158deg, rgba(255,255,255,.98), color-mix(in srgb, var(--soft) 72%, white));
          border: 1.25px solid color-mix(in srgb, var(--accent) 68%, white);
          border-radius: 5px 7px 6px 8px / 7px 5px 8px 6px;
          clip-path: polygon(2% 6%, 96% 1%, 100% 18%, 98% 93%, 5% 100%, 0 82%);
          box-shadow: 0 0 0 2px rgba(255,255,255,.94), 2px 2px 0 color-mix(in srgb, var(--accent) 34%, white), 0 6px 10px -8px rgba(74,46,67,.72);
          font-weight: 900; line-height: 1; letter-spacing: .025em; text-shadow: 0 1px 0 white;
        }
        .type-sticker::before {
          content: ""; width: 3px; height: 3px; margin-right: 4px; flex: 0 0 auto;
          border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 1px rgba(255,255,255,.85);
        }
        .type-sticker > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .type-sticker--sm { min-width: 34px; padding: 4px 7px 4px 6px; font-size: 7.8px; }
        .type-sticker--lg { min-width: 48px; padding: 7px 11px 7px 9px; font-size: 10px; }

        .type-chip {
          display: inline-block;
          font-size: 8px; font-weight: 900; background: var(--accent); color: white;
          padding: 2px 8px; border: 1px solid rgba(255,255,255,.9); border-radius: 5px 6px 5px 7px; white-space: nowrap;
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 36%, white), inset 0 1px 0 rgba(255,255,255,.48);
          transform: rotate(-1.5deg);
        }
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

        .flip-container { width: 100%; aspect-ratio: var(--card-ratio); cursor: pointer; perspective: 1400px; }
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
          transform: rotateY(180deg); display: flex; flex-direction: column; padding: 27px 24px 21px; text-align: left; overflow: hidden;
          background:
            linear-gradient(152deg, rgba(255,255,255,.72), color-mix(in srgb, var(--soft) 24%, rgba(255,255,255,.9))),
            var(--paper) center / 320px,
            white;
          border: 1px solid rgba(255,255,255,.96);
          box-shadow: 0 0 0 3px var(--rarity-solid), 0 0 0 7px white, 0 22px 42px -18px rgba(42,16,34,.65);
        }
        .flip-face.flip-back::before {
          content: ""; position: absolute; inset: 10px; border: 1px dashed color-mix(in srgb, var(--rarity-solid) 40%, white); border-radius: 20px; pointer-events: none;
        }
        .flip-face.flip-back::after {
          content: "OSHI"; position: absolute; right: -9px; bottom: 38px; z-index: 0;
          color: color-mix(in srgb, var(--rarity-solid) 9%, transparent); font-size: 72px; font-weight: 950; line-height: 1;
          letter-spacing: -.08em; transform: rotate(-90deg); transform-origin: center; pointer-events: none;
        }

        .flip-face.flip-front {
          background: transparent; overflow: visible;
          filter: drop-shadow(0 19px 18px rgba(42,16,34,.36));
        }
        .flip-face.flip-front .modal-glow {
          --glow-low: .14; --glow-high: .28;
          position: absolute; inset: -6%; z-index: -1; border-radius: 38%;
          background: radial-gradient(circle, color-mix(in srgb, var(--rarity-solid) 76%, transparent) 0%, transparent 68%);
          filter: blur(32px); animation: pulse-glow 2.7s ease-in-out infinite;
          pointer-events: none; will-change: opacity, transform;
        }

        .ornate-frame { position: relative; width: 100%; height: 100%; border-radius: 26px; }
        .frame-photo { position: absolute; inset: var(--photo-window-inset); border-radius: 16%; overflow: hidden; background: linear-gradient(160deg, var(--accent) 0%, var(--soft) 140%); display: flex; align-items: center; justify-content: center; }
        .frame-photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 58%, rgba(44,17,35,.4)); pointer-events: none; }
        .frame-photo-glyph { font-size: 64px; font-weight: 800; color: white; text-shadow: 0 3px 0 rgba(0,0,0,0.1); }

        .nameplate {
          position: absolute; left: 7.2%; right: 7.2%; bottom: 5%; z-index: 6;
          min-height: 21%; box-sizing: border-box; padding: 16px 18px 12px; text-align: center;
          border: 1px solid rgba(255,255,255,.96); border-top-color: color-mix(in srgb, var(--rarity-solid) 34%, white);
          border-radius: 7px 6px 20px 18px / 6px 5px 16px 14px;
          background:
            linear-gradient(174deg, rgba(255,255,255,.98), rgba(255,250,253,.95)),
            var(--paper) center / 250px;
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--rarity-solid) 22%, white), 0 11px 20px -15px rgba(51,20,41,.78), inset 0 1px 0 white;
          clip-path: polygon(0 5%, 2% 1%, 47% 0, 98% 1%, 100% 5%, 99% 97%, 96% 100%, 4% 99%, 1% 96%);
        }
        .nameplate::before {
          content: ""; position: absolute; left: 15%; right: 15%; top: 6px; height: 1px;
          background: repeating-linear-gradient(90deg, var(--rarity-solid) 0 7px, transparent 7px 12px); opacity: .3;
        }
        .nameplate::after {
          content: "♡"; position: absolute; left: 15px; bottom: 12px;
          color: color-mix(in srgb, var(--rarity-solid) 55%, #ef79ab); font-size: 11px; transform: rotate(-10deg);
        }
        .nameplate-name { margin: 0; color: var(--ink); font-size: 18px; font-weight: 900; letter-spacing: .045em; }
        .nameplate-divider { display: block; color: var(--rarity-solid); font-size: 8px; margin: 4px auto 3px; }
        .nameplate-kana { margin: 0; color: var(--ink-soft); font-size: 10.5px; font-weight: 700; letter-spacing: .055em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .profile-card-header {
          position: relative; z-index: 2; min-height: 78px; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
          padding: 0 3px 14px; border-bottom: 1px dashed color-mix(in srgb, var(--rarity-solid) 34%, white);
        }
        .profile-card-heading { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
        .profile-card-heading .rarity-badge { transform: rotate(-2.5deg); transform-origin: left center; }
        .profile-card-kicker {
          color: color-mix(in srgb, var(--rarity-solid) 74%, var(--ink)); font-size: 7.5px; font-weight: 900;
          letter-spacing: .115em; white-space: nowrap;
        }
        .profile-card-number {
          flex: 0 0 auto; min-width: 73px; box-sizing: border-box; margin-top: 1px; padding: 8px 8px 7px; text-align: center;
          color: color-mix(in srgb, var(--rarity-solid) 70%, var(--ink)); background: rgba(255,255,255,.68);
          border: 1px solid color-mix(in srgb, var(--rarity-solid) 26%, white); border-radius: 48% 52% 46% 54% / 55% 48% 52% 45%;
          box-shadow: 0 2px 0 rgba(255,255,255,.9), 0 7px 14px -12px rgba(74,46,67,.7); transform: rotate(1.5deg);
        }
        .profile-card-number small { display: block; font-size: 6.5px; font-weight: 850; letter-spacing: .08em; line-height: 1; }
        .profile-card-number strong { display: block; margin-top: 3px; font-size: 21px; font-weight: 950; letter-spacing: .08em; line-height: 1; }

        .profile-card-main {
          position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); align-items: center;
          gap: 18px; min-height: 224px; padding: 18px 6px 13px;
        }
        .profile-polaroid {
          position: relative; width: 100%; max-width: 142px; box-sizing: border-box; justify-self: center; padding: 8px 8px 29px;
          background: linear-gradient(165deg, rgba(255,255,255,.99), #fffafb); border: 1px solid rgba(255,255,255,.98);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--rarity-solid) 18%, white), 0 10px 18px -13px rgba(74,46,67,.84);
          transform: rotate(-3deg);
        }
        .profile-tape {
          position: absolute; z-index: 3; top: -9px; left: 50%; width: 54px; height: 19px; transform: translateX(-50%) rotate(2deg);
          background: color-mix(in srgb, var(--accent) 18%, rgba(255,251,231,.9)); opacity: .9;
          border-left: 1px dashed color-mix(in srgb, var(--accent) 25%, white); border-right: 1px dashed color-mix(in srgb, var(--accent) 25%, white);
          clip-path: polygon(2% 10%, 100% 0, 96% 91%, 4% 100%);
          box-shadow: 0 1px 2px rgba(74,46,67,.08);
        }
        .profile-polaroid-photo {
          aspect-ratio: 1 / 1; overflow: hidden; display: flex; align-items: center; justify-content: center;
          color: white; font-size: 44px; font-weight: 950; background: linear-gradient(155deg, var(--accent), var(--soft) 130%);
        }
        .profile-polaroid-img { width: 100%; height: 100%; object-fit: cover; object-position: var(--photo-position); }
        .profile-polaroid-caption {
          position: absolute; left: 0; right: 0; bottom: 8px; text-align: center; color: var(--ink-soft);
          font-family: "Comic Sans MS", "Hiragino Maru Gothic ProN", cursive; font-size: 9px; font-weight: 800; letter-spacing: .08em;
        }

        .profile-identity { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
        .profile-label {
          margin-bottom: 8px; padding: 2px 7px 2px 8px; color: white; background: var(--accent); border-radius: 3px 5px 4px 6px;
          font-size: 7px; font-weight: 900; letter-spacing: .12em; box-shadow: 1px 2px 0 color-mix(in srgb, var(--accent) 30%, white); transform: rotate(-1deg);
        }
        .modal-name {
          max-width: 100%; margin: 0; color: var(--ink); font-family: "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif;
          font-size: clamp(22px, 7vw, 29px); font-weight: 950; line-height: 1.16; letter-spacing: .035em; overflow-wrap: anywhere;
          text-shadow: 0 2px 0 white;
        }
        .modal-name.is-long { font-size: clamp(18px, 5vw, 22px); letter-spacing: 0; white-space: nowrap; }
        .modal-kana { max-width: 100%; margin: 5px 0 0; color: var(--ink-soft); font-size: 9.5px; font-weight: 750; letter-spacing: .055em; line-height: 1.35; overflow-wrap: anywhere; }
        .card-name,
        .card-kana,
        .nameplate-name,
        .nameplate-kana,
        .modal-name,
        .modal-kana { font-family: var(--font-card-name); }
        .profile-name-underline {
          width: min(96px, 92%); height: 6px; margin: 7px 0 11px; opacity: .72;
          background: linear-gradient(176deg, transparent 36%, color-mix(in srgb, var(--rarity-solid) 68%, white) 39% 61%, transparent 64%);
          border-radius: 50%; transform: rotate(-2deg);
        }
        .profile-identity .type-sticker { max-width: 100%; transform: rotate(1.5deg); }

        .profile-affiliation {
          position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: center; min-height: 57px; box-sizing: border-box;
          margin: 2px 5px 0; padding: 10px 42px 9px 16px; background: color-mix(in srgb, var(--soft) 62%, rgba(255,255,255,.92));
          border: 1px solid white; border-radius: 7px 9px 8px 10px; box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, white), 2px 3px 0 color-mix(in srgb, var(--accent) 13%, white);
          clip-path: polygon(1% 5%, 98% 0, 100% 92%, 3% 100%, 0 77%);
        }
        .profile-affiliation-label { color: var(--ink-soft); font-size: 7px; font-weight: 900; letter-spacing: .12em; }
        .profile-affiliation strong { margin-top: 3px; color: var(--ink); font-size: 13px; font-weight: 900; letter-spacing: .025em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .profile-affiliation-heart { position: absolute; right: 16px; top: 50%; color: var(--accent); font-size: 22px; transform: translateY(-50%) rotate(8deg); }
        .profile-card-footer {
          position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: auto; padding: 11px 5px 0;
          color: color-mix(in srgb, var(--rarity-solid) 52%, var(--ink-soft)); border-top: 1px dotted color-mix(in srgb, var(--rarity-solid) 26%, white);
          font-size: 6.5px; font-weight: 900; letter-spacing: .12em;
        }

        .flip-hint {
          margin: 14px 0 0; text-align: center; font-size: 11.5px; font-weight: 700; color: white;
          display: flex; align-items: center; justify-content: center; gap: 5px; opacity: .9;
          text-shadow: 0 2px 6px rgba(38,15,31,.6);
        }

        .empty-state { max-width: 780px; margin: 40px auto; padding: 25px; text-align: center; color: var(--ink-soft); font-size: 13.5px; font-weight: 700; background: var(--paper) center / 280px, rgba(255,255,255,.78); border: 1px solid white; border-radius: 22px; box-shadow: 0 0 0 1px var(--line); }

        @media (max-width: 720px) {
          .zukan-root { padding: 24px 13px 50px; }
          .rarity-board { margin: 25px auto 25px; gap: 6px; padding: 15px 7px 8px; border-radius: 18px; }
          .rarity-board::before { left: 17px; }
          .rarity-board::after { right: 15px; }
          .rarity-pill { padding: 9px 3px 8px; border-radius: 10px 10px 12px 12px; }
          .rarity-pill::before { display: none; }
          .toolbar { flex-direction: column; align-items: stretch; }
          .search-wrap { max-width: none; width: 100%; }
          .type-tabs { gap: 6px; }
          .type-tabs .type-tab { flex: 1; padding: 8px 7px 8px 23px; }
          .type-tabs .type-tab::before { left: 6px; width: 12px; height: 12px; }
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
          .type-sticker--sm { max-width: 62px; padding-inline: 5px; font-size: 7px; }
          .rarity-badge--sm { transform: scale(.9); transform-origin: top left; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
        }
      `}</style>

      <header className="zukan-header">
        <span className="eyebrow">✦ Collection Zukan · Prototype</span>
        <h1 className="zukan-title">推し 図鑑</h1>
        <p className="zukan-sub">偶像 ・ 演員 ・ コンカフェ嬢 — 依稀有度分類</p>
        {loading && <p className="zukan-status" role="status">連接 Supabase 中…</p>}
        {!loading && loadError && (
          <p className="zukan-status">
            尚未連上 Supabase（{loadError}），目前顯示範例資料。請確認 .env 是否設定正確。
          </p>
        )}
      </header>

      {loading ? (
        <div className="grid loading-grid" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => <div className="loading-card" key={index} />)}
        </div>
      ) : (
        <>
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
              type="button"
              aria-pressed={activeType === t}
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
            type="button"
            aria-pressed={activeRarity === r}
          >
            {r === "all" ? "全部稀有度" : RARITY_META[r].label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid">
          {filtered.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              onOpen={setOpenPerson}
              animationIndex={people.findIndex((person) => person.id === p.id)}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">找不到符合條件的人物，換個關鍵字或分類看看。</p>
      )}

      {openPerson && (
        <DetailModal key={openPerson.id} person={openPerson} onClose={() => setOpenPerson(null)} />
      )}
        </>
      )}
    </div>
  );
}
