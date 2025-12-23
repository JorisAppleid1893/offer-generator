"use client";

import { useMemo, useState } from "react";

type Result = {
  price_eur: number;
  rationale: string;
  offer_text: string;
  scope_bullets: string[];
};

export default function Home() {
  const [projectType, setProjectType] = useState("Website");
  const [scope, setScope] = useState("5 Seiten, Kontaktformular, Basic SEO");
  const [deadline, setDeadline] = useState("Normal (2–4 Wochen)");
  const [experience, setExperience] = useState("Mid");
  const [risk, setRisk] = useState("Normal");
  const [targetHourly, setTargetHourly] = useState("85");
  const [proCode, setProCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  const payload = useMemo(
    () => ({
      projectType,
      scope,
      deadline,
      experience,
      risk,
      targetHourly: Number(targetHourly || 0),
      proCode: proCode.trim(),
    }),
    [projectType, scope, deadline, experience, risk, targetHourly, proCode]
  );

  async function generate() {
    setLoading(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Fehler");
      setRes(data as Result);
    } catch (e: any) {
      setErr(e?.message || "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 860,
        margin: "32px auto",
        padding: "0 16px",
        fontFamily: "system-ui",
      }}
    >
      <h1>KI-Angebot & Preisgenerator (V0.1)</h1>

      <p>
        Gib Eckdaten ein → du bekommst Preisvorschlag, Begründung und einen
        fertigen Angebotstext.
        <br />
        <small>Hinweis: Keine Steuer- oder Rechtsberatung. Richtwerte.</small>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <label>
          Projektart
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option>Website</option>
            <option>Web-App</option>
            <option>Design</option>
            <option>SEO</option>
            <option>Text/Copy</option>
            <option>Beratung</option>
          </select>
        </label>

        <label>
          Erfahrung
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option>Junior</option>
            <option>Mid</option>
            <option>Senior</option>
          </select>
        </label>

        <label>
          Deadline
          <select
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option>Normal (2–4 Wochen)</option>
            <option>Schnell (7–14 Tage)</option>
            <option>Express (≤ 7 Tage)</option>
          </select>
        </label>

        <label>
          Projektrisiko / Unklarheit
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option>Normal</option>
            <option>Mittel (unklare Anforderungen)</option>
            <option>Hoch (viele Abhängigkeiten)</option>
          </select>
        </label>

        <label style={{ gridColumn: "1 / -1" }}>
          Umfang (kurz)
          <input
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Ziel-Stundensatz (€) (optional)
          <input
            value={targetHourly}
            onChange={(e) => setTargetHourly(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Pro-Code (optional)
          <input
            value={proCode}
            onChange={(e) => setProCode(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: "10px 14px",
          cursor: "pointer",
        }}
      >
        {loading ? "Generiere..." : "Preis & Angebot erzeugen"}
      </button>
<p style={{ marginTop: 12 }}>
  <a
    href="https://jorisrudolf.gumroad.com/l/thfnd"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      fontWeight: 600,
      textDecoration: "underline",
    }}
  >
    PRO freischalten (20 Angebote/Tag)
  </a>
</p>
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {res && (
        <div
          style={{
            marginTop: 18,
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 14,
          }}
        >
          <h2>Ergebnis</h2>

          <p>
            <b>Empfohlener Projektpreis:</b>{" "}
            €{res.price_eur.toLocaleString("de-DE")}
          </p>

          <p>
            <b>Begründung:</b> {res.rationale}
          </p>

          <h3>Leistungsumfang</h3>
          <ul>
            {res.scope_bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>

          <h3>Angebotstext</h3>
          <textarea
            value={res.offer_text}
            readOnly
            style={{ width: "100%", minHeight: 260, padding: 10 }}
          />
        </div>
      )}
    </main>
  );
}
