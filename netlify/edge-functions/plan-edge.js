export default async (request, context) => {
  const url = new URL(request.url);
  
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try { body = await request.json(); } 
  catch(e) { return new Response(JSON.stringify({error:"Invalid JSON"}), {status:400}); }

  const { destination, adults, kids, days, budget, tripType } = body;
  const kidsText = kids && kids.length ? ` + ילדים בגילאי ${kids.join(", ")}` : "";
  const travelers = `${adults} מבוגרים${kidsText}`;

  const prompt = `תכנן טיול ל${destination} עבור ${travelers}, ${days} ימים, תקציב ${budget}.
החזר JSON בלבד ללא backticks:
{"destination_en":"ENGLISH","destination_he":"${destination}","currency":"USD","season_note":"בדוק תחזית","flights":[{"airline":"El Al","from":"TLV","to":"קוד","duration":"3 שעות","stops":"ישיר","price_usd":500,"tip":"הזמן מראש"},{"airline":"Turkish Airlines","from":"TLV","to":"IST","duration":"5 שעות","stops":"עצירה","price_usd":380,"tip":"זול יותר"},{"airline":"Lufthansa","from":"TLV","to":"FRA","duration":"4 שעות","stops":"עצירה","price_usd":420,"tip":"אמין"}],"days":[{"day":1,"theme":"גילוי","area":"מרכז","activities":[{"time":"09:00","name":"אטרקציה","type":"museum","description":"ביקור מרתק במקום המפורסם ביותר בעיר.","price_usd":15,"duration":"2 שעות","emoji":"🏛","tip":"בוא בבוקר"},{"time":"12:00","name":"ארוחת צהריים","type":"food","description":"מסעדה מקומית אותנטית.","price_usd":20,"duration":"1 שעה","emoji":"🍽","tip":"נסה את המנה המקומית"},{"time":"15:00","name":"סיור","type":"culture","description":"טיול ברגל ברובע ההיסטורי.","price_usd":0,"duration":"2 שעות","emoji":"🚶","tip":"לבש נעלים נוחות"}]}],"restaurants":[{"name":"מסעדה 1","cuisine":"מקומי","price_range":"$$","rating":4.5,"must_order":"מנה מיוחדת","area":"מרכז","why":"מומלץ מאוד"},{"name":"מסעדה 2","cuisine":"ים תיכוני","price_range":"$","rating":4.3,"must_order":"פלאפל","area":"שוק","why":"זול וטעים"},{"name":"מסעדה 3","cuisine":"בינלאומי","price_range":"$$$","rating":4.7,"must_order":"סטייק","area":"צפון","why":"חוויה יוקרתית"},{"name":"מסעדה 4","cuisine":"אסייתי","price_range":"$$","rating":4.4,"must_order":"ראמן","area":"מזרח","why":"אותנטי"}],"transport":[{"type":"metro","name":"רכבת תחתית","icon":"🚇","description":"הכי מהיר וזול","price":"$3/נסיעה","tip":"קנה כרטיס יומי"},{"type":"taxi","name":"אובר","icon":"🚗","description":"נוח ללילה","price":"$10-20","tip":"השתמש באפליקציה"},{"type":"bus","name":"אוטובוס","icon":"🚌","description":"הכי זול","price":"$1-2","tip":"קנה כרטיס מראש"}],"budget":{"flights":500,"hotels":600,"food":300,"attractions":150,"transport":100,"misc":80,"total_per_person":1230},"tips":[{"category":"ויזה","text":"בדוק דרישות מראש"},{"category":"כסף","text":"כרטיס ללא עמלת המרה"},{"category":"תרבות","text":"למד כמה מילים מקומיות"},{"category":"בטיחות","text":"שמור על הדרכון"},{"category":"אפליקציות","text":"הורד Google Maps offline"},{"category":"שפה","text":"Google Translate עם מצלמה"}]}
עכשיו צור ${days} ימים מלאים עם 3 פעילויות ליום עבור ${destination}.`;

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
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
        model: "openai/gpt-oss-120b:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000
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
