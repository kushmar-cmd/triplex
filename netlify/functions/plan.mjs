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

  const prompt = `תכנן טיול ל${destination} עבור ${travelers}, ${days} ימים, תקציב ${budget}.
החזר JSON בלבד ללא backticks:
{"destination_en":"ENGLISH","destination_he":"${destination}","currency":"USD","season_note":"בדוק תחזית","flights":[{"airline":"El Al","from":"TLV","to":"קוד","duration":"3 שעות","stops":"ישיר","price_usd":500,"tip":"הזמן מראש"}],"days":[{"day":1,"theme":"גילוי","area":"מרכז","activities":[{"time":"09:00","name":"אטרקציה","type":"museum","description":"ביקור מרתק במקום המפורסם.","price_usd":15,"duration":"2 שעות","emoji":"🏛","tip":"בוא בבוקר"}]}],"restaurants":[{"name":"מסעדה","cuisine":"מקומי","price_range":"$$","rating":4.5,"must_order":"מנה","area":"מרכז","why":"מומלץ"}],"transport":[{"type":"metro","name":"רכבת","icon":"🚇","description":"זול ומהיר","price":"$5/יום","tip":"קנה כרטיס יומי"}],"budget":{"flights":500,"hotels":600,"food":300,"attractions":150,"transport":100,"misc":80,"total_per_person":1230},"tips":[{"category":"ויזה","text":"בדוק מראש"},{"category":"כסף","text":"כרטיס ללא עמלה"}]}
צור ${days} ימים עם 3 פעילויות ליום, 3 טיסות, 4 מסעדות, 3 תחבורות. נתונים אמיתיים ל${destination}.`;

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
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000
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
