import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function baseHoursEstimate(projectType: string, scope: string) {
  // MVP-Heuristik: grob nach Projektart + Scope-Länge
  const s = scope.trim().length;
  const scopeFactor = clamp(Math.round(s / 40), 1, 6); // 1..6
  const base =
    projectType === "Website"
      ? 18
      : projectType === "Web-App"
      ? 40
      : projectType === "Design"
      ? 16
      : projectType === "SEO"
      ? 14
      : projectType === "Text/Copy"
      ? 10
      : 12;

  return base * scopeFactor;
}

function multipliers(deadline: string, experience: string, risk: string) {
  const deadlineM = deadline.includes("Express")
    ? 1.35
    : deadline.includes("Schnell")
    ? 1.2
    : 1.0;

  const expM = experience === "Senior" ? 1.25 : experience === "Junior" ? 0.85 : 1.0;

  const riskM = risk.includes("Hoch") ? 1.3 : risk.includes("Mittel") ? 1.15 : 1.0;

  return { deadlineM, expM, riskM };
}

// Super-simple "Pro" logic (MVP). Replace later with Gumroad license validation.
function isPro(proCode?: string) {
  return (proCode || "") === (process.env.PRO_CODE || "");
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const body = await req.json();
    const projectType = String(body.projectType || "Website");
    const scope = String(body.scope || "");
    const deadline = String(body.deadline || "Normal");
    const experience = String(body.experience || "Mid");
    const risk = String(body.risk || "Normal");
    const targetHourly = Number(body.targetHourly || 0);
    const proCode = String(body.proCode || "");

    // --- Input guardrails ---
    if (!scope.trim()) {
      return Response.json({ error: "Bitte Umfang eingeben." }, { status: 400 });
    }
    if (scope.length > 400) {
      return Response.json({ error: "Umfang zu lang (max 400 Zeichen)." }, { status: 400 });
    }

    // --- Daily limit (MVP, in-memory) ---
    const pro = isPro(proCode);
    const now = new Date();
    const dayKey = `${ip}:${now.toISOString().slice(0, 10)}`;

    // @ts-ignore
    globalThis.__usage = globalThis.__usage || new Map<string, number>();
    // @ts-ignore
    const usageMap: Map<string, number> = globalThis.__usage;

    const used = usageMap.get(dayKey) || 0;
    const limit = pro ? 20 : 1;

    if (used >= limit) {
      return Response.json(
        { error: pro ? "Tageslimit erreicht (Pro)." : "Free-Limit erreicht. Pro-Code verwenden." },
        { status: 429 }
      );
    }
    usageMap.set(dayKey, used + 1);

    // --- Price logic ---
    const hours = baseHoursEstimate(projectType, scope);
    const { deadlineM, expM, riskM } = multipliers(deadline, experience, risk);
    const hourly = targetHourly > 0 ? clamp(targetHourly, 30, 250) : 85;

    const raw = hours * hourly * deadlineM * expM * riskM;
    const price = Math.round(raw / 50) * 50; // round to nearest 50 EUR

    // --- LLM prompt ---
    const prompt = `
Du bist ein professioneller, sachlicher Angebot-Assistent für Freelancer in Deutschland.
Erstelle ein Angebot mit Preisbegründung. Keine Steuer- oder Rechtsberatung.
Schreibe klar, knapp, seriös (kein Marketing, keine Emojis).
Gib am Ende einen Hinweis: "Richtwert, abhängig vom finalen Scope."

Eingaben:
- Projektart: ${projectType}
- Umfang: ${scope}
- Deadline: ${deadline}
- Erfahrung: ${experience}
- Risiko: ${risk}
- Empfohlener Projektpreis: €${price}

Gib als JSON zurück mit Keys:
price_eur (number), rationale (string), scope_bullets (array of strings), offer_text (string).
`;

    const resp = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 500,
    });

    const text = resp.output_text?.trim() || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) {
      return Response.json({ error: "Konnte Ausgabe nicht parsen. Bitte erneut versuchen." }, { status: 500 });
    }

    const jsonText = text.slice(start, end + 1);
    const data = JSON.parse(jsonText);

    // enforce our computed price
    data.price_eur = price;

    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e?.message || "Serverfehler" }, { status: 500 });
  }
}
