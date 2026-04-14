import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════
   AI SERVICE — uses Anthropic API directly
   ═══════════════════════════════════════════ */
const callClaude = async (userPrompt, systemPrompt) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  const text = data.content
    ?.map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n");
  return text || "";
};

const analyzeProfile = async (p) => {
  const sys = `Du bist BizCoach AI, ein erfahrener Business-Berater. Du gibst immer NUR valides JSON zurück, ohne Backticks, ohne Markdown, ohne Erklärungstext davor oder danach.`;

  const user = `Erstelle 3 personalisierte Business-Vorschläge für dieses Profil:

- Idee vorhanden: ${p.hasIdea ? "Ja: " + p.ideaText : "Nein, braucht eine Idee"}
- Skills: ${(p.skills || []).join(", ")}${p.skillsCustom ? ", " + p.skillsCustom : ""}
- Zeit pro Woche: ${p.time}${p.timeCustom ? " (" + p.timeCustom + ")" : ""}
- Startkapital: ${p.budget}${p.budgetCustom ? " (" + p.budgetCustom + ")" : ""}
- Ziel: ${p.goal}${p.goalCustom ? " – " + p.goalCustom : ""}
${p.extras ? "- Zusätzlich: " + p.extras : ""}

WICHTIG: Die Vorschläge MÜSSEN individuell auf die Skills, das Budget und die Zeitangaben zugeschnitten sein. Keine generischen Antworten.

Antworte NUR mit diesem JSON-Array:
[{"title":"Name des Business","description":"2-3 Sätze Beschreibung","whyFit":"1 Satz warum es zum Profil passt","difficulty":"Einfach|Mittel|Fortgeschritten","incomeRange":"z.B. 500-2000€/Monat","firstSteps":["Schritt 1","Schritt 2","Schritt 3","Schritt 4","Schritt 5"],"timeToFirstIncome":"z.B. 2-4 Wochen","icon":"passendes emoji"}]`;

  try {
    const text = await callClaude(user, sys);
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(clean);
  } catch (e) {
    console.error("Parse error:", e);
    return null;
  }
};

const deepDive = async (biz, question) => {
  const sys = `Du bist BizCoach AI. Antworte konkret, umsetzbar, auf Deutsch. Max 150 Wörter. Kein Markdown. Sei direkt und praxisnah.`;
  const user = `Der Nutzer arbeitet an: "${biz.title}" – ${biz.description}\n\nSeine Frage: "${question}"`;
  try {
    return await callClaude(user, sys);
  } catch {
    return "Verbindungsfehler. Bitte versuche es erneut.";
  }
};

/* ═══════════════════════════════════════════
   QUIZ CONFIGURATION
   ═══════════════════════════════════════════ */
const QUESTIONS = [
  {
    id: "hasIdea", title: "Hast du schon eine\nBusiness-Idee?", sub: "Sei ehrlich – beides ist völlig okay",
    type: "choice", autoAdvance: true,
    opts: [
      { v: true, label: "Ja, ich habe eine Idee", icon: "💡" },
      { v: false, label: "Nein, ich brauche eine", icon: "🔍" },
    ],
  },
  {
    id: "ideaText", title: "Beschreib deine\nIdee kurz", sub: "Ein paar Stichworte reichen",
    type: "text", placeholder: "z.B. Online-Shop für nachhaltige Mode, App für Hundebesitzer...",
    cond: (p) => p.hasIdea === true,
  },
  {
    id: "skills", title: "Was sind deine\nstärksten Skills?", sub: "Wähle aus und/oder schreib eigene dazu",
    type: "multi", customId: "skillsCustom", customPh: "Weitere Skills eingeben...",
    opts: [
      { v: "Design & Kreativität", icon: "🎨" },
      { v: "Programmieren & Tech", icon: "💻" },
      { v: "Marketing & Social Media", icon: "📱" },
      { v: "Texten & Content", icon: "✍️" },
      { v: "Verkaufen & Verhandeln", icon: "🤝" },
      { v: "Organisation & Planung", icon: "📋" },
      { v: "Handwerk & Produktion", icon: "🔧" },
      { v: "Beratung & Coaching", icon: "🎯" },
    ],
  },
  {
    id: "time", title: "Wie viel Zeit\npro Woche?", sub: "Sei realistisch",
    type: "choice", customId: "timeCustom", customPh: "Oder genaue Stundenzahl...",
    opts: [
      { v: "1-5 Stunden", icon: "🕐" },
      { v: "5-15 Stunden", icon: "🕔" },
      { v: "15-30 Stunden", icon: "🕘" },
      { v: "Vollzeit (30+ Stunden)", icon: "⏰" },
    ],
  },
  {
    id: "budget", title: "Wie viel\nStartkapital?", sub: "Alles ist möglich – auch 0€",
    type: "choice", customId: "budgetCustom", customPh: "Oder genauen Betrag eingeben...",
    opts: [
      { v: "0€ – Kein Budget", icon: "🆓" },
      { v: "1 – 500€", icon: "💶" },
      { v: "500 – 2.000€", icon: "💰" },
      { v: "Mehr als 2.000€", icon: "🏦" },
    ],
  },
  {
    id: "goal", title: "Was ist\ndein Ziel?", sub: "Wo willst du hin?",
    type: "choice", customId: "goalCustom", customPh: "Oder eigenes Ziel beschreiben...",
    opts: [
      { v: "Nebeneinkommen (200-1000€/Mo)", icon: "🌱" },
      { v: "Vollzeit-Selbstständigkeit", icon: "🚀" },
      { v: "Skalierbares Business aufbauen", icon: "📈" },
      { v: "Erstmal ausprobieren & lernen", icon: "🧪" },
    ],
  },
  {
    id: "extras", title: "Noch etwas\nWichtiges?", sub: "Optional – hilft der KI bessere Vorschläge zu machen",
    type: "text", placeholder: "z.B. Ich bin Student, lebe in Berlin, habe Erfahrung mit Fotografie...",
    optional: true,
  },
];

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */
const F = "'SF Pro Display', -apple-system, system-ui, sans-serif";
const BG = "linear-gradient(168deg, #0C0C1D 0%, #171730 45%, #14213D 100%)";
const O1 = "#FF6B35";
const O2 = "#FF8C42";

const pill = (active) => ({
  flex: 1, height: 3.5, borderRadius: 2,
  background: active ? O1 : "rgba(255,255,255,0.1)",
  transition: "background 0.4s",
});

const cardBase = (selected) => ({
  display: "flex", alignItems: "center", gap: 12, width: "100%",
  padding: "14px 16px", borderRadius: 14, cursor: "pointer",
  background: selected
    ? "linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,107,53,0.04))"
    : "rgba(255,255,255,0.03)",
  border: selected
    ? "1.5px solid rgba(255,107,53,0.45)"
    : "1.5px solid rgba(255,255,255,0.06)",
  color: "#fff", fontFamily: F, textAlign: "left", boxSizing: "border-box",
  transition: "all 0.2s ease",
});

const inputBase = {
  flex: 1, padding: "13px 0", background: "transparent",
  border: "none", color: "#fff", fontSize: 14, outline: "none", fontFamily: F,
};

/* ═══════════════════════════════════════════
   WELCOME SCREEN
   ═══════════════════════════════════════════ */
function Welcome({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: BG, color: "#fff", fontFamily: F, padding: "40px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, left: -80, width: 280, height: 280, background: "radial-gradient(circle, rgba(255,107,53,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ width: 82, height: 82, borderRadius: 22, background: `linear-gradient(135deg, ${O1}, ${O2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, marginBottom: 24, boxShadow: "0 14px 44px rgba(255,107,53,0.22)" }}>🚀</div>
      <h1 style={{ fontSize: 33, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.8px" }}>BizCoach <span style={{ color: O1 }}>AI</span></h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", margin: "0 0 32px", lineHeight: 1.45, maxWidth: 280 }}>Dein KI-Business-Berater.<br />Von der Idee zum Fahrplan.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%", maxWidth: 300, marginBottom: 32 }}>
        {["Beantworte ein paar Fragen", "KI analysiert dein Profil", "Erhalte 3 Business-Vorschläge"].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 11, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,107,53,0.1)", color: O1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{t}</span>
          </div>
        ))}
      </div>
      <button onClick={onStart} style={{ width: "100%", maxWidth: 300, padding: 17, borderRadius: 16, background: `linear-gradient(135deg, ${O1}, ${O2})`, border: "none", color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: F, boxShadow: "0 8px 32px rgba(255,107,53,0.25)", letterSpacing: 0.3 }}>Jetzt starten →</button>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.16)", marginTop: 14 }}>Kostenlose Analyse · Keine Anmeldung</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   QUIZ SCREEN
   ═══════════════════════════════════════════ */
function Quiz({ question: q, profile: p, onChange, onNext, onBack, step, total }) {
  const val = p[q.id];
  const hasCustom = q.customId && p[q.customId]?.trim();
  const canGo = q.optional ? true
    : q.type === "multi" ? ((val && val.length > 0) || hasCustom)
    : q.type === "text" ? val?.trim()
    : val != null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, color: "#fff", fontFamily: F, position: "relative" }}>
      <div style={{ position: "absolute", top: -120, right: -100, width: 280, height: 280, background: "radial-gradient(circle, rgba(255,107,53,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ padding: "16px 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {step > 0 ? (
            <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer", fontFamily: F, padding: 0 }}>← Zurück</button>
          ) : <div />}
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", fontWeight: 500 }}>{step + 1} / {total}</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {Array.from({ length: total }).map((_, i) => <div key={i} style={pill(i <= step)} />)}
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: "16px 24px 8px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, margin: 0, whiteSpace: "pre-line", letterSpacing: "-0.3px" }}>{q.title}</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", margin: "8px 0 0" }}>{q.sub}</p>
      </div>

      {/* Options */}
      <div style={{ flex: 1, padding: "10px 20px 8px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>

        {/* Choice */}
        {q.type === "choice" && q.opts.map((o) => (
          <button key={String(o.v)} onClick={() => { onChange(q.id, o.v); if (q.autoAdvance && !q.customId) setTimeout(onNext, 280); }}
            style={cardBase(val === o.v)}>
            <span style={{ fontSize: 22, flexShrink: 0, width: 30, textAlign: "center" }}>{o.icon}</span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, lineHeight: 1.35 }}>{o.label}</span>
          </button>
        ))}

        {/* Multi */}
        {q.type === "multi" && q.opts.map((o) => {
          const sel = (val || []).includes(o.v);
          return (
            <button key={o.v} onClick={() => {
              const a = val || [];
              onChange(q.id, sel ? a.filter((x) => x !== o.v) : [...a, o.v]);
            }} style={cardBase(sel)}>
              <span style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: "center" }}>{o.icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>{o.v}</span>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: sel ? "none" : "2px solid rgba(255,255,255,0.14)",
                background: sel ? O1 : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, color: "#fff", fontWeight: 700, transition: "all 0.2s",
              }}>{sel ? "✓" : ""}</div>
            </button>
          );
        })}

        {/* Text */}
        {q.type === "text" && (
          <textarea value={val || ""} onChange={(e) => onChange(q.id, e.target.value)} placeholder={q.placeholder}
            style={{
              width: "100%", minHeight: 130, padding: 16, borderRadius: 14,
              background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.07)",
              color: "#fff", fontSize: 15, lineHeight: 1.5, resize: "none",
              fontFamily: F, outline: "none", boxSizing: "border-box",
            }}
          />
        )}

        {/* Custom input for choice/multi */}
        {q.customId && (
          <div style={{
            borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 10, padding: "0 14px",
            background: "rgba(255,255,255,0.02)", marginTop: 2,
          }}>
            <span style={{ fontSize: 15, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>✏️</span>
            <input value={p[q.customId] || ""} onChange={(e) => onChange(q.customId, e.target.value)}
              placeholder={q.customPh} style={inputBase} />
          </div>
        )}
      </div>

      {/* Button */}
      {(q.type !== "choice" || q.customId) && (
        <div style={{ padding: "10px 20px 28px" }}>
          <button onClick={onNext} disabled={!canGo && !q.optional}
            style={{
              width: "100%", padding: 16, borderRadius: 14, border: "none",
              background: (canGo || q.optional) ? `linear-gradient(135deg, ${O1}, ${O2})` : "rgba(255,255,255,0.04)",
              color: (canGo || q.optional) ? "#fff" : "rgba(255,255,255,0.18)",
              fontSize: 17, fontWeight: 600, cursor: (canGo || q.optional) ? "pointer" : "default",
              fontFamily: F, transition: "all 0.3s",
            }}>
            Weiter →
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOADING SCREEN
   ═══════════════════════════════════════════ */
function Loading() {
  const [dots, setDots] = useState("");
  const [mi, setMi] = useState(0);
  const msgs = ["Analysiere dein Profil", "Suche passende Business-Modelle", "Erstelle deinen persönlichen Plan"];

  useEffect(() => {
    const a = setInterval(() => setDots((p) => p.length >= 3 ? "" : p + "."), 500);
    const b = setInterval(() => setMi((p) => Math.min(p + 1, 2)), 2800);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: BG, color: "#fff", fontFamily: F, textAlign: "center", padding: 40 }}>
      <div style={{ width: 70, height: 70, borderRadius: 20, background: `linear-gradient(135deg, ${O1}, ${O2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, marginBottom: 28, animation: "bpx 2s ease-in-out infinite" }}>🚀</div>
      <style>{`@keyframes bpx{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
      <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 6px" }}>{msgs[mi]}{dots}</p>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.28)" }}>KI arbeitet für dich</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RESULTS SCREEN
   ═══════════════════════════════════════════ */
function Results({ results, onSelect, onRestart }) {
  const dc = { Einfach: "#4ADE80", Mittel: "#FBBF24", Fortgeschritten: "#F87171" };
  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: F }}>
      <div style={{ padding: "24px 20px 6px" }}>
        <p style={{ fontSize: 11, color: O1, fontWeight: 700, margin: "0 0 5px", letterSpacing: 1.5, textTransform: "uppercase" }}>Deine Ergebnisse</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>3 Business-Ideen für dich</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", margin: "6px 0 0" }}>Tippe auf eine Idee für Details & Fahrplan</p>
      </div>
      <div style={{ padding: "14px 20px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {results.map((b, i) => (
          <button key={i} onClick={() => onSelect(b)} style={{
            textAlign: "left", padding: 18, borderRadius: 16, cursor: "pointer", width: "100%",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            color: "#fff", fontFamily: F, boxSizing: "border-box",
          }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28, width: 48, height: 48, borderRadius: 13, background: "rgba(255,107,53,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{b.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{b.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", margin: "5px 0 0", lineHeight: 1.4 }}>{b.description}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ fontSize: 11, padding: "4px 9px", borderRadius: 7, fontWeight: 600, background: `${dc[b.difficulty] || "#999"}18`, color: dc[b.difficulty] || "#999" }}>{b.difficulty}</span>
              <span style={{ fontSize: 11, padding: "4px 9px", borderRadius: 7, fontWeight: 600, background: "rgba(255,107,53,0.1)", color: O2 }}>💰 {b.incomeRange}</span>
              <span style={{ fontSize: 11, padding: "4px 9px", borderRadius: 7, fontWeight: 600, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}>⏱ {b.timeToFirstIncome}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", flex: 1 }}>{b.whyFit}</span>
              <span style={{ fontSize: 16, color: O1, marginLeft: 8 }}>→</span>
            </div>
          </button>
        ))}
      </div>
      <div style={{ padding: "4px 20px 32px" }}>
        <button onClick={onRestart} style={{ width: "100%", padding: 14, borderRadius: 12, background: "none", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer", fontFamily: F }}>← Neue Analyse starten</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL SCREEN
   ═══════════════════════════════════════════ */
function Detail({ biz, onBack }) {
  const [tab, setTab] = useState("steps");
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState([]);
  const endRef = useRef(null);

  const quickQ = ["Wie starte ich damit?", "Was brauche ich rechtlich?", "Wie bekomme ich Kunden?", "Welche Tools brauche ich?", "Was sind typische Fehler?"];

  const send = async (t) => {
    if (!t.trim()) return;
    setMsgs((p) => [...p, { r: "u", t: t.trim() }]);
    setInput("");
    setLoading(true);
    const reply = await deepDive(biz, t.trim());
    setMsgs((p) => [...p, { r: "a", t: reply }]);
    setLoading(false);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const steps = biz.firstSteps || [];
  const prog = steps.length ? checked.length / steps.length : 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, color: "#fff", fontFamily: F }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 0" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer", fontFamily: F, padding: 0 }}>← Zurück zu den Ergebnissen</button>
      </div>
      <div style={{ padding: "10px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 30, width: 50, height: 50, borderRadius: 14, background: "rgba(255,107,53,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{biz.icon}</span>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{biz.title}</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>{biz.incomeRange} · {biz.difficulty}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "0 20px", margin: "0 0 10px" }}>
        {[{ id: "steps", l: "📋 Fahrplan" }, { id: "chat", l: "💬 Deep Dive" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
            background: tab === t.id ? "rgba(255,107,53,0.12)" : "rgba(255,255,255,0.025)",
            color: tab === t.id ? O2 : "rgba(255,255,255,0.32)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F,
          }}>{t.l}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === "steps" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 28px" }}>
            {/* Progress */}
            <div style={{ margin: "0 0 12px", padding: "12px 14px", borderRadius: 12, background: "rgba(255,107,53,0.04)", border: "1px solid rgba(255,107,53,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Fortschritt</span>
                <span style={{ fontSize: 12, color: O1, fontWeight: 700 }}>{checked.length}/{steps.length}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${prog * 100}%`, background: `linear-gradient(90deg, ${O1}, ${O2})`, transition: "width 0.4s" }} />
              </div>
            </div>

            {steps.map((s, i) => {
              const done = checked.includes(i);
              return (
                <button key={i} onClick={() => setChecked((p) => done ? p.filter((x) => x !== i) : [...p, i])}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
                    padding: "12px 14px", marginBottom: 6, borderRadius: 12,
                    background: done ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.015)",
                    border: done ? "1px solid rgba(74,222,128,0.12)" : "1px solid rgba(255,255,255,0.04)",
                    color: "#fff", cursor: "pointer", textAlign: "left", fontFamily: F, boxSizing: "border-box",
                  }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    background: done ? "#4ADE80" : "transparent",
                    border: done ? "none" : "2px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "#0C0C1D", fontWeight: 700,
                  }}>{done ? "✓" : ""}</div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: O1, display: "block", marginBottom: 2 }}>SCHRITT {i + 1}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.4, textDecoration: done ? "line-through" : "none", color: done ? "rgba(255,255,255,0.28)" : "#fff" }}>{s}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 12px" }}>
              {msgs.length === 0 && (
                <>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", margin: "0 0 12px" }}>Frag mich alles über "{biz.title}":</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {quickQ.map((q) => (
                      <button key={q} onClick={() => send(q)} style={{
                        padding: "11px 14px", borderRadius: 11, textAlign: "left",
                        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer", fontFamily: F,
                      }}>{q}</button>
                    ))}
                  </div>
                </>
              )}
              {msgs.map((m, i) => (
                <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: m.r === "u" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "85%", padding: "11px 15px", borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                    background: m.r === "u" ? `linear-gradient(135deg, ${O1}, ${O2})` : "rgba(255,255,255,0.045)",
                    borderBottomRightRadius: m.r === "u" ? 4 : 16,
                    borderBottomLeftRadius: m.r === "a" ? 4 : 16,
                  }}>{m.t}</div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", marginBottom: 10 }}>
                  <div style={{ padding: "11px 18px", borderRadius: 16, borderBottomLeftRadius: 4, background: "rgba(255,255,255,0.04)", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
                    Denke nach<span style={{ animation: "dotpulse 1.4s infinite" }}>...</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div style={{ padding: "10px 20px 28px", display: "flex", gap: 8, background: "rgba(12,12,29,0.85)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Stell eine Frage..."
                style={{ flex: 1, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#fff", fontSize: 15, outline: "none", fontFamily: F }} />
              <button onClick={() => send(input)} disabled={!input.trim() || loading}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: "none", flexShrink: 0,
                  background: input.trim() && !loading ? `linear-gradient(135deg, ${O1}, ${O2})` : "rgba(255,255,255,0.04)",
                  color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>↑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function BizCoachAI() {
  const [scr, setScr] = useState("welcome");
  const [step, setStep] = useState(0);
  const [prof, setProf] = useState({});
  const [results, setResults] = useState(null);
  const [sel, setSel] = useState(null);

  const qs = QUESTIONS.filter((q) => !q.cond || q.cond(prof));
  const set = (k, v) => setProf((p) => ({ ...p, [k]: v }));

  const next = async () => {
    if (step < qs.length - 1) return setStep(step + 1);
    setScr("loading");
    const r = await analyzeProfile(prof);
    setResults(r || [
      { title: "Freelance Webentwicklung", description: "Webseiten für kleine Unternehmen. Nutze deine Skills.", whyFit: "Passt zu deinem Profil", difficulty: "Mittel", incomeRange: "1.000-4.000€/Mo", firstSteps: ["Portfolio erstellen", "Upwork-Profil", "Lokale Firmen kontaktieren", "Preispakete definieren", "Erste Projekte annehmen"], timeToFirstIncome: "2-4 Wochen", icon: "💻" },
      { title: "Digitale Templates", description: "Notion/Canva-Vorlagen auf Etsy verkaufen.", whyFit: "Skalierbar & flexibel", difficulty: "Einfach", incomeRange: "200-2.000€/Mo", firstSteps: ["Etsy Top-Seller recherchieren", "5 Vorlagen erstellen", "Shop einrichten", "Social Media starten", "Sortiment erweitern"], timeToFirstIncome: "1-3 Wochen", icon: "📄" },
      { title: "Online-Kurs erstellen", description: "Teile dein Wissen als Videokurs auf Udemy oder eigener Plattform.", whyFit: "Passives Einkommen möglich", difficulty: "Mittel", incomeRange: "300-3.000€/Mo", firstSteps: ["Thema & Zielgruppe definieren", "Kursstruktur planen", "Erste 3 Module aufnehmen", "Auf Udemy veröffentlichen", "Per Social Media bewerben"], timeToFirstIncome: "3-6 Wochen", icon: "🎓" },
    ]);
    setScr("results");
  };

  const restart = () => { setScr("welcome"); setStep(0); setProf({}); setResults(null); setSel(null); };

  if (scr === "welcome") return <Welcome onStart={() => setScr("quiz")} />;
  if (scr === "quiz" && qs[step]) return <Quiz question={qs[step]} profile={prof} onChange={set} onNext={next} onBack={() => step > 0 && setStep(step - 1)} step={step} total={qs.length} />;
  if (scr === "loading") return <Loading />;
  if (scr === "results" && results && !sel) return <Results results={results} onSelect={setSel} onRestart={restart} />;
  if (sel) return <Detail biz={sel} onBack={() => setSel(null)} />;
  return null;
}
