import React, { useEffect, useMemo, useState } from "react";

/**
 * Divine Kingdom Marriage Devotional (365-day rotating)
 * - Rotation anchored to January 1 (Day 1) using day-of-year
 * - Categories: Marriage, Blended Family, Children, Parents, Grandchildren
 * - Favorites + Journal stored in localStorage (device-based)
 * - Search across a rolling window (last 120 days + next 30 days)
 *
 * NOTE: NKJV references are included (not full verse text).
 */

// ---------------- Utilities ----------------
const pad2 = (n) => String(n).padStart(2, "0");

function isoDateLocal(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDate(s) {
  // parse as local date to avoid UTC shifting
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function dayOfYear(d) {
  // Jan 1 = 1
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function pickFrom(arr, idx) {
  if (!arr || arr.length === 0) return "";
  return arr[idx % arr.length];
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------- Content ----------------
const CATEGORIES = ["Marriage", "Blended Family", "Children", "Parents", "Grandchildren"];

const MODULES = {
  Marriage: {
    focuses: [
      "God at the center",
      "Unity and agreement",
      "Christlike love",
      "Communication and understanding",
      "Forgiveness and healing",
      "Faithfulness and protection",
      "Gratitude and renewal",
      "Friendship and joy",
      "Healthy conflict resolution",
      "Respect and honor",
      "Intimacy and tenderness",
      "Servant leadership",
      "Financial unity and stewardship",
      "Time, priorities, and boundaries",
      "Prayer partnership",
    ],
    scriptures: [
      { ref: "Ecclesiastes 4:12", idea: "God strengthens a covenant" },
      { ref: "Amos 3:3", idea: "Walking in agreement" },
      { ref: "Ephesians 5:25", idea: "Sacrificial love" },
      { ref: "James 1:19", idea: "Listen before speaking" },
      { ref: "Colossians 3:13", idea: "Forgive as Christ forgave" },
      { ref: "Proverbs 4:23", idea: "Guard the heart" },
      { ref: "Psalm 103:2", idea: "Remember God’s benefits" },
      { ref: "1 Corinthians 13:4–7", idea: "Love’s character" },
      { ref: "Proverbs 15:1", idea: "Gentle answer turns away wrath" },
      { ref: "Ephesians 4:2–3", idea: "Keep unity in peace" },
    ],
    prayers: [
      "Lord, be the center of our marriage. Establish our covenant in Your strength.",
      "Unite our hearts and give us one mind in Christ.",
      "Teach us to love sacrificially and consistently.",
      "Guard our words; make us quick to listen and slow to speak.",
      "Help us forgive quickly and restore trust with wisdom.",
      "Protect our marriage from temptation, distraction, and division.",
      "Renew our joy and friendship. Rekindle tenderness and respect.",
      "Guide our decisions and align our priorities with Your will.",
    ],
    prompts: [
      "What would it look like for God to be more central in our marriage this week?",
      "Where do we need clearer unity or better communication?",
      "Is there anything we need to forgive or address gently and directly?",
      "What is one practical way I can honor my spouse today?",
      "What boundary or habit would strengthen our relationship?",
    ],
  },

  "Blended Family": {
    focuses: [
      "Unity and peace in the home",
      "Grace for transitions",
      "Healing past wounds",
      "Healthy boundaries",
      "Respect between households",
      "Consistency and stability",
      "Communication with kindness",
      "Steadfast love and patience",
      "Shared family culture",
      "Godly influence and protection",
    ],
    scriptures: [
      { ref: "Psalm 133:1", idea: "Dwelling together in unity" },
      { ref: "Colossians 3:12–14", idea: "Compassion and love" },
      { ref: "Romans 12:18", idea: "Live peaceably as possible" },
      { ref: "James 1:19", idea: "Listen and respond wisely" },
      { ref: "Psalm 147:3", idea: "Heals the brokenhearted" },
      { ref: "Ephesians 4:29", idea: "Words that build up" },
      { ref: "Proverbs 3:5–6", idea: "Guidance for decisions" },
    ],
    prayers: [
      "Lord, establish peace in our home and unity within our blended family.",
      "Give us grace for transitions and patience in the process.",
      "Heal wounds from the past and help us build a new culture of love.",
      "Teach us healthy boundaries and wise communication with all involved.",
      "Give our children security, stability, and confidence in Your love.",
    ],
    prompts: [
      "Where do we need more patience and grace in our blended family?",
      "What is one step we can take to build safety and stability for the children?",
      "Are there boundaries that need to be clarified in love?",
      "How can we speak words that build rather than divide?",
    ],
  },

  Children: {
    focuses: [
      "Peace and emotional stability",
      "Wisdom and discernment",
      "Salvation and spiritual hunger",
      "Protection and godly friends",
      "Purpose and identity in Christ",
      "Obedience and teachability",
      "Healing and restoration",
      "Courage and faith",
      "Integrity and character",
      "Healthy decision-making",
      "Freedom from fear",
      "Respect and honor",
    ],
    scriptures: [
      { ref: "Isaiah 54:13", idea: "Taught by the Lord; great peace" },
      { ref: "Proverbs 22:6", idea: "Train up a child" },
      { ref: "Acts 16:31", idea: "Believe and be saved" },
      { ref: "Psalm 91:11", idea: "Angelic protection" },
      { ref: "Jeremiah 29:11", idea: "Future and hope" },
      { ref: "James 1:5", idea: "Wisdom from God" },
      { ref: "2 Timothy 1:7", idea: "Power, love, sound mind" },
      { ref: "Psalm 139:14", idea: "Wonderfully made" },
    ],
    prayers: [
      "Lord, teach our children Your ways and establish peace in them.",
      "Give them wisdom, discernment, and godly friends.",
      "Protect them from harm and from influences that pull them from You.",
      "Reveal their identity and purpose in Christ.",
      "Draw them into sincere faith and a love for Your Word.",
    ],
    prompts: [
      "Which child (or area) needs focused prayer today, and why?",
      "What virtue do we want to model more clearly as parents?",
      "What protective boundary or routine would help our children thrive?",
      "How can we speak life and purpose over our children today?",
    ],
  },

  Parents: {
    focuses: [
      "Honor and patience",
      "Health and strength",
      "Peace and comfort",
      "Salvation and spiritual growth",
      "Reconciliation and restored relationships",
      "Wisdom for decisions",
      "Provision and stability",
      "Legacy and generational faith",
    ],
    scriptures: [
      { ref: "Exodus 20:12", idea: "Honor father and mother" },
      { ref: "3 John 1:2", idea: "Health and well-being" },
      { ref: "Psalm 32:8", idea: "Guidance and instruction" },
      { ref: "Psalm 145:4", idea: "One generation praises another" },
      { ref: "Romans 12:18", idea: "Live peaceably" },
      { ref: "Philippians 4:19", idea: "God supplies needs" },
      { ref: "Isaiah 46:4", idea: "God carries in old age" },
    ],
    prayers: [
      "Lord, help us honor our parents with love, patience, and humility.",
      "Strengthen them in body and mind; surround them with peace.",
      "Where relationships are strained, bring reconciliation and healing.",
      "Draw them close to You and deepen their faith.",
    ],
    prompts: [
      "What does honoring our parents look like in this season?",
      "Is there a practical act of care we can offer this week?",
      "Is there anything we need to forgive or address for reconciliation?",
      "What legacy of faith do we want to continue?",
    ],
  },

  Grandchildren: {
    focuses: [
      "Blessing and favor",
      "Protection and innocence",
      "Early love for God",
      "Wisdom and joyful growth",
      "Future paths and callings",
      "Healthy friendships and mentors",
      "Peace and stability",
      "Generational blessing",
    ],
    scriptures: [
      { ref: "Psalm 127:3", idea: "Children are a heritage" },
      { ref: "Proverbs 22:6", idea: "Train up a child" },
      { ref: "Matthew 18:10", idea: "God’s care for little ones" },
      { ref: "Psalm 103:17", idea: "Mercy to children’s children" },
      { ref: "Psalm 37:23", idea: "The Lord orders steps" },
      { ref: "Isaiah 54:13", idea: "Great peace" },
      { ref: "Luke 2:52", idea: "Grow in wisdom and favor" },
    ],
    prayers: [
      "Lord, bless our grandchildren with wisdom, protection, and joy.",
      "Guard their hearts and minds; keep them safe and anchored in truth.",
      "Plant an early love for You and a hunger for Your Word.",
      "Order their steps and prepare their future callings.",
    ],
    prompts: [
      "What specific blessing do we want to speak over our grandchildren today?",
      "Where do they need protection (physically, emotionally, spiritually)?",
      "What faith practices can we model or share with them?",
      "What hopes are we entrusting to God for their future?",
    ],
  },
};

function generateActionStep(category, idx) {
  const common = [
    "Pray aloud together for 2 minutes each.",
    "Share one gratitude and one need with gentleness.",
    "Send one encouraging text to your spouse today.",
    "Schedule 20 minutes to talk without distractions.",
    "Write down one area to surrender to God and pray over it.",
  ];

  const byCat = {
    Marriage: [
      "Do one small act of honor for your spouse today (quietly, just love).",
      "Ask: “What would make you feel supported this week?” and listen fully.",
      "Bless your spouse out loud with a short prayer before bed.",
      "Apologize quickly for anything the Holy Spirit brings to mind.",
    ],
    "Blended Family": [
      "Choose one moment today to respond with extra patience and calm.",
      "Discuss one boundary that would increase stability for the children.",
      "Speak one affirming sentence to each child today.",
      "Pray for unity across households with humility and wisdom.",
    ],
    Children: [
      "Speak one blessing over a child by name (even if they are not present).",
      "Ask a child a heart question: “How are you really doing?”",
      "Pray specifically for godly friends and mentors for your children.",
      "Model one Christlike response in a stressful moment.",
    ],
    Parents: [
      "Reach out to a parent/in-law with encouragement or practical support.",
      "Pray for health and peace specifically by name.",
      "If appropriate, take one step toward reconciliation with wisdom.",
      "Honor your parents with words today—choose respect over criticism.",
    ],
    Grandchildren: [
      "Pray blessings over your grandchildren by name.",
      "Share one faith story with a grandchild (age-appropriate).",
      "Pray for their future callings and protection.",
      "Speak peace and identity over them (loved, safe, and seen by God).",
    ],
  };

  const pool = [...(byCat[category] || []), ...common];
  return pickFrom(pool, idx);
}

function generateDevotional(dateObj) {
  const doy = dayOfYear(dateObj); // Jan 1 = 1
  const year = dateObj.getFullYear();

  // Rotate category based on day-of-year (anchored to Jan 1)
  const cat = CATEGORIES[(doy - 1) % CATEGORIES.length];
  const mod = MODULES[cat];

  // Variation indices
  const i1 = (doy * 7 + year) % 997;
  const i2 = (doy * 13 + year) % 991;

  const focus = pickFrom(mod.focuses, i1);
  const scripture = pickFrom(mod.scriptures, i2);
  const prayer = pickFrom(mod.prayers, i1);
  const promptA = pickFrom(mod.prompts, i1);
  const promptB = pickFrom(mod.prompts, i2 + 3);

  return {
    id: isoDateLocal(dateObj), // unique per calendar date (YYYY-MM-DD)
    dateISO: isoDateLocal(dateObj),
    dayOfYear: doy,
    category: cat,
    title: `${cat}: ${capitalize(focus)}`,
    focus,
    scriptureRef: scripture?.ref || "",
    scriptureIdea: scripture?.idea || "",
    guidedPrayer: prayer,
    journalPrompts: [promptA, promptB].filter(Boolean),
    actionStep: generateActionStep(cat, i2),
  };
}

// ---------------- Storage ----------------
const LS_KEY = "dk-devotional-v1";

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  const base = { favorites: {}, journal: {} };
  if (!raw) return base;
  const parsed = safeJsonParse(raw, base);
  return {
    favorites: parsed.favorites || {},
    journal: parsed.journal || {},
  };
}

function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// ---------------- Styles ----------------
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 70%)",
    padding: 16,
    color: "#111827",
    fontFamily:
      'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif',
  },
  container: { maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 },
  header: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 6px 20px rgba(17, 24, 39, 0.06)",
  },
  titleRow: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 },
  h1: { margin: 0, fontSize: 20, fontWeight: 800 },
  sub: { marginTop: 6, marginBottom: 0, color: "#4b5563", fontSize: 13, lineHeight: 1.35 },
  tabRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 },
  tabBtn: (active) => ({
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: active ? "#111827" : "#ffffff",
    color: active ? "#ffffff" : "#111827",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  }),
  dateControls: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  navBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
  },
  input: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 13,
    background: "#fff",
  },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" },
  chipWrap: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    padding: "6px 10px",
    fontSize: 12,
    background: "#fff",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 6px 20px rgba(17, 24, 39, 0.05)",
  },
  section: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 4px 14px rgba(17, 24, 39, 0.04)",
  },
  sectionTitle: { fontSize: 12, color: "#374151", fontWeight: 900, letterSpacing: 0.3, marginBottom: 8 },
  p: { margin: 0, color: "#111827", lineHeight: 1.55, fontSize: 14 },
  small: { color: "#6b7280", fontSize: 12, marginTop: 8 },
  textarea: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    lineHeight: 1.45,
    fontFamily: "inherit",
    background: "#fff",
  },
  btnRow: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  btn: (primary = false) => ({
    border: "1px solid #e5e7eb",
    background: primary ? "#111827" : "#fff",
    color: primary ? "#fff" : "#111827",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  }),
  list: { paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 8, color: "#111827" },
  divider: { height: 1, background: "#e5e7eb", margin: "10px 0" },
  footer: { textAlign: "center", color: "#6b7280", fontSize: 12, paddingBottom: 18 },
  resultBtn: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "#fff",
    cursor: "pointer",
  },
  resultMeta: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" },
};

// ---------------- UI helpers ----------------
function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

// ---------------- App ----------------
export default function App() {
  const [selectedDateISO, setSelectedDateISO] = useState(isoDateLocal());
  const [tab, setTab] = useState("Today"); // Today | Search | Favorites | Journal
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [store, setStore] = useState(() => {
    if (typeof window === "undefined") return { favorites: {}, journal: {} };
    return loadState();
  });

  useEffect(() => {
    saveState(store);
  }, [store]);

  const selectedDate = useMemo(() => parseIsoDate(selectedDateISO), [selectedDateISO]);
  const devotional = useMemo(() => generateDevotional(selectedDate), [selectedDate]);

  const isFav = !!store.favorites[devotional.id];
  const journalEntry = store.journal[devotional.id]?.text || "";

  const searchCorpus = useMemo(() => {
    const center = parseIsoDate(selectedDateISO);
    const items = [];
    const start = new Date(center);
    start.setDate(center.getDate() - 120);
    const end = new Date(center);
    end.setDate(center.getDate() + 30);

    const cursor = new Date(start);
    while (cursor <= end) {
      items.push(generateDevotional(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return items;
  }, [selectedDateISO]);

  const filteredSearch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return searchCorpus
      .filter((d) => (categoryFilter === "All" ? true : d.category === categoryFilter))
      .filter((d) => {
        if (!q) return true;
        const blob = `${d.title} ${d.focus} ${d.scriptureRef} ${d.scriptureIdea} ${d.guidedPrayer} ${d.actionStep}`.toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 60);
  }, [searchCorpus, query, categoryFilter]);

  const favoriteItems = useMemo(() => {
    const ids = Object.keys(store.favorites).filter((k) => store.favorites[k]);
    return ids
      .map((id) => generateDevotional(parseIsoDate(id)))
      .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
  }, [store.favorites]);

  const journalItems = useMemo(() => {
    const ids = Object.keys(store.journal);
    return ids
      .map((id) => {
        const dev = generateDevotional(parseIsoDate(id));
        const meta = store.journal[id];
        return { ...dev, journalText: meta?.text || "", updatedAt: meta?.updatedAt || "" };
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [store.journal]);

  function toggleFavorite(id) {
    setStore((s) => ({ ...s, favorites: { ...s.favorites, [id]: !s.favorites[id] } }));
  }

  function updateJournal(id, text) {
    setStore((s) => ({
      ...s,
      journal: { ...s.journal, [id]: { text, updatedAt: new Date().toISOString() } },
    }));
  }

  function clearJournal(id) {
    setStore((s) => {
      const next = { ...s.journal };
      delete next[id];
      return { ...s, journal: next };
    });
  }

  function jumpDays(delta) {
    const d = parseIsoDate(selectedDateISO);
    d.setDate(d.getDate() + delta);
    setSelectedDateISO(isoDateLocal(d));
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.titleRow}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, color: "#6b7280" }}>
                DAILY PRAYER DEVOTIONAL
              </div>
              <h1 style={styles.h1}>Divine Kingdom Marriage Devotional</h1>
              <p style={styles.sub}>
                A 365-day rotating devotional (NKJV references) for marriage and family prayer. Rotation starts January 1.
              </p>
            </div>

            <div style={styles.dateControls}>
              <button style={styles.navBtn} onClick={() => jumpDays(-1)} type="button" aria-label="Previous day">
                ◀
              </button>
              <input
                style={styles.input}
                type="date"
                value={selectedDateISO}
                onChange={(e) => setSelectedDateISO(e.target.value)}
              />
              <button style={styles.navBtn} onClick={() => jumpDays(1)} type="button" aria-label="Next day">
                ▶
              </button>
            </div>
          </div>

          <div style={styles.tabRow}>
            {["Today", "Search", "Favorites", "Journal"].map((t) => (
              <button key={t} style={styles.tabBtn(tab === t)} onClick={() => setTab(t)} type="button">
                {t}
              </button>
            ))}
          </div>
        </header>

        {tab === "Today" && (
          <>
            <div style={styles.chipRow}>
              <div style={styles.chipWrap}>
                <span style={styles.chip}>{devotional.dateISO}</span>
                <span style={styles.chip}>{devotional.category}</span>
                <span style={styles.chip}>Day {devotional.dayOfYear}</span>
                {devotional.scriptureRef ? <span style={styles.chip}>NKJV: {devotional.scriptureRef}</span> : null}
              </div>

              <button style={styles.btn(true)} onClick={() => toggleFavorite(devotional.id)} type="button">
                {isFav ? "★ Favorited" : "☆ Favorite"}
              </button>
            </div>

            <div style={styles.card}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{devotional.title}</div>
              <div style={{ marginTop: 6, color: "#4b5563", fontSize: 13 }}>
                <strong>Focus:</strong> {capitalize(devotional.focus)}
              </div>
            </div>

            <Section title="Scripture (NKJV reference)">
              <div style={{ fontWeight: 900 }}>{devotional.scriptureRef}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
                <strong>Theme:</strong> {devotional.scriptureIdea}
              </div>
              <div style={styles.small}>Tip: Read the verse(s) in your Bible, then pray aloud together.</div>
            </Section>

            <Section title="Guided Prayer">
              <p style={styles.p}>{devotional.guidedPrayer}</p>
            </Section>

            <Section title="Action Step (Do This Today)">
              <p style={styles.p}>{devotional.actionStep}</p>
            </Section>

            <Section title="Journaling Prompts">
              <ul style={styles.list}>
                {devotional.journalPrompts.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </Section>

            <Section title="Your Journal (saved on this device)">
              <textarea
                style={styles.textarea}
                rows={6}
                placeholder="Write what God is showing you, what you’re praying for, and any answered prayers…"
                value={journalEntry}
                onChange={(e) => updateJournal(devotional.id, e.target.value)}
              />
              <div style={styles.btnRow}>
                <button style={styles.btn(false)} onClick={() => updateJournal(devotional.id, journalEntry)} type="button">
                  Save
                </button>
                <button style={styles.btn(false)} onClick={() => clearJournal(devotional.id)} type="button">
                  Clear
                </button>
              </div>
              <div style={styles.small}>
                Note: This version stores entries locally on your device. Later we can add logins and syncing if you want.
              </div>
            </Section>
          </>
        )}

        {tab === "Search" && (
          <div style={styles.card}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Search Devotionals</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <input
                style={{ ...styles.input, flex: "1 1 280px" }}
                placeholder="Search focus, Scripture reference, or prayer…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <select
                style={styles.input}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Category filter"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
              Showing {filteredSearch.length} result(s) (window: last 120 days + next 30 days).
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {filteredSearch.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  style={styles.resultBtn}
                  onClick={() => {
                    setSelectedDateISO(d.dateISO);
                    setTab("Today");
                  }}
                >
                  <div style={styles.resultMeta}>
                    <div style={{ fontWeight: 900 }}>{d.title}</div>
                    <div style={styles.chipWrap}>
                      <span style={styles.chip}>{d.dateISO}</span>
                      <span style={styles.chip}>{d.category}</span>
                      <span style={styles.chip}>Day {d.dayOfYear}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                    <strong>NKJV:</strong> {d.scriptureRef}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>{d.guidedPrayer}</div>
                </button>
              ))}

              {filteredSearch.length === 0 && (
                <div style={{ ...styles.section, background: "#f9fafb" }}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>No results found.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Favorites" && (
          <div style={styles.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Favorites</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{favoriteItems.length} saved</div>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {favoriteItems.map((d) => (
                <div key={d.id} style={styles.section}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{d.title}</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
                        <strong>NKJV:</strong> {d.scriptureRef}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>{d.dateISO}</div>
                    </div>

                    <div style={styles.btnRow}>
                      <button
                        style={styles.btn(false)}
                        onClick={() => {
                          setSelectedDateISO(d.dateISO);
                          setTab("Today");
                        }}
                        type="button"
                      >
                        Open
                      </button>
                      <button style={styles.btn(false)} onClick={() => toggleFavorite(d.id)} type="button">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {favoriteItems.length === 0 && (
                <div style={{ ...styles.section, background: "#f9fafb" }}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    No favorites yet. Tap “Favorite” on any day to save it here.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Journal" && (
          <div style={styles.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Journal Entries</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{journalItems.length} saved</div>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {journalItems.map((d) => (
                <div key={d.id} style={styles.section}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{d.title}</div>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <span style={styles.chip}>{d.dateISO}</span>
                        <span style={styles.chip}>{d.category}</span>
                        <span style={styles.chip}>NKJV: {d.scriptureRef}</span>
                      </div>
                    </div>

                    <div style={styles.btnRow}>
                      <button
                        style={styles.btn(false)}
                        onClick={() => {
                          setSelectedDateISO(d.dateISO);
                          setTab("Today");
                        }}
                        type="button"
                      >
                        Open Day
                      </button>
                      <button style={styles.btn(false)} onClick={() => clearJournal(d.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ ...styles.section, background: "#f9fafb", marginTop: 12 }}>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5 }}>{d.journalText}</div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                    Last updated: {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : ""}
                  </div>
                </div>
              ))}

              {journalItems.length === 0 && (
                <div style={{ ...styles.section, background: "#f9fafb" }}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    No journal entries yet. Write in “Today” and it will appear here.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={styles.footer}>
          Tip: After deploying on Vercel, open the link in Safari and tap Share → Add to Home Screen to install as an app.
        </div>
      </div>
    </div>
  );
}
