export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try { body = await req.json(); } 
  catch(e) { return new Response(JSON.stringify({error:"Invalid JSON"}), {status:400}); }

  const { destination, adults, kids, days, budget, tripType } = body;
  const kidsText = kids && kids.length ? ` + ילדים בגילאי ${kids.join(", ")}` : "";
  const travelers = `${adults} מבוגרים${kidsText}`;

  const prompt = `אתה מומחה ישראלי בתכנון טיולים. תכנן טיול ל${destination} עבור ${travelers}, ${days} ימים, תקציב ${budget}, סוג: ${tripType}.
החזר JSON בלבד ללא backticks ללא הסברים:
{"destination_en":"ENGLISH","destination_he":"עברית","currency":"מטבע ₪","season_note":"מזג אוויר","flights":[{"airline":"שם","from":"TLV","to":"קוד","duration":"X שעות","stops":"ישיר","price_usd":600,"tip":"טיפ"}],"days":[{"day":1,"theme":"נושא","area":"אזור","activities":[{"time":"09:00","name":"שם","type":"museum","description":"תיאור 2 משפטים","price_usd":0,"duration":"2 שעות","emoji":"🏛","tip":"טיפ"}]}],"restaurants":[{"name":"שם","cuisine":"מטבח","price_range":"$$","rating":4.5,"must_order":"מנה","area":"שכונה","why":"סיבה"}],"transport":[{"type":"metro","name":"שם","icon":"🚇","description":"תיאור","price":"$10/יום","tip":"טיפ"}],"budget":{"flights":600,"hotels":800,"food":400,"attractions":200,"transport":150,"misc":100,"total_per_person":1650},"tips":[{"category":"ויזה","text":"..."},{"category":"כסף","text":"..."},{"category":"תרבות","text":"..."},{"category":"בטיחות","text":"..."},{"category":"אפליקציות","text":"..."},{"category":"שפה","text":"..."}]}
דרישות: ${days} ימים עם 4 פעילויות ליום, 3 טיסות שונות, 6 מסעדות, 4 תחבורות. נתונים אמיתיים ל${destination}.`;

  const apiKey = Netlify.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({error:"Missing API key"}), {status:500});

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://triplex73.netlify.app",
        "X-Title": "TripLex"
      },
      body: JSON.stringify({
        model: "google/gemma-3-12b-it:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8000
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return new Response(JSON.stringify({error: err}), {status:500});
    }

    const d = await r.json();
    let raw = d.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return new Response(raw, { headers: {"Content-Type":"application/json"} });

  } catch(e) {
    return new Response(JSON.stringify({error: e.message}), {status:500});
  }
};

export const config = { path: "/api/plan" }; 
