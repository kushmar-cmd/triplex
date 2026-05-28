export default async (request, context) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try { body = await request.json(); } 
  catch(e) { return new Response(JSON.stringify({error:"Invalid JSON"}), {status:400}); }

  const { destination, adults, kids, days, budget } = body;
  const kidsText = kids && kids.length ? ` + kids ages ${kids.join(", ")}` : "";
  const travelers = `${adults} adults${kidsText}`;

  const prompt = `Plan a trip to ${destination} for ${travelers}, ${days} days, budget: ${budget}.
Return ONLY valid JSON, no backticks:
{"destination_en":"${destination}","destination_he":"${destination}","currency":"USD","season_note":"check forecast","flights":[{"airline":"El Al","from":"TLV","to":"LHR","duration":"5h","stops":"direct","price_usd":650,"tip":"book early"},{"airline":"Turkish Airlines","from":"TLV","to":"IST","duration":"7h","stops":"1 stop","price_usd":420,"tip":"cheaper"},{"airline":"Lufthansa","from":"TLV","to":"FRA","duration":"6h","stops":"1 stop","price_usd":480,"tip":"reliable"}],"days":[{"day":1,"theme":"Arrival & Explore","area":"City Center","activities":[{"time":"10:00","name":"Main Attraction","type":"museum","description":"Visit the most famous landmark in the city.","price_usd":20,"duration":"2 hours","emoji":"🏛","tip":"Go early"},{"time":"13:00","name":"Local Lunch","type":"food","description":"Try authentic local cuisine at a popular restaurant.","price_usd":15,"duration":"1 hour","emoji":"🍽","tip":"Ask for daily special"},{"time":"15:00","name":"City Walk","type":"culture","description":"Explore the historic district on foot.","price_usd":0,"duration":"2 hours","emoji":"🚶","tip":"Wear comfortable shoes"}]}],"restaurants":[{"name":"Local Gem","cuisine":"Local","price_range":"$$","rating":4.6,"must_order":"Signature dish","area":"Center","why":"Highly recommended"},{"name":"Street Food Market","cuisine":"Street Food","price_range":"$","rating":4.4,"must_order":"Local snack","area":"Market","why":"Cheap and authentic"},{"name":"Fine Dining","cuisine":"International","price_range":"$$$","rating":4.8,"must_order":"Chef special","area":"Downtown","why":"Special occasion"},{"name":"Cafe Corner","cuisine":"Cafe","price_range":"$","rating":4.3,"must_order":"Coffee and pastry","area":"Old Town","why":"Great atmosphere"}],"transport":[{"type":"metro","name":"Metro/Subway","icon":"🚇","description":"Fastest and cheapest way to get around.","price":"$3/ride","tip":"Buy day pass"},{"type":"taxi","name":"Uber/Taxi","icon":"🚗","description":"Convenient for late nights.","price":"$10-20","tip":"Use app"},{"type":"bus","name":"City Bus","icon":"🚌","description":"Cheapest option.","price":"$1-2","tip":"Buy weekly pass"}],"budget":{"flights":650,"hotels":700,"food":350,"attractions":200,"transport":120,"misc":100,"total_per_person":1420},"tips":[{"category":"Visa","text":"Check requirements in advance"},{"category":"Money","text":"Use credit card with no foreign fees"},{"category":"Culture","text":"Learn a few local words"},{"category":"Safety","text":"Keep passport copy in cloud"},{"category":"Apps","text":"Download Google Maps offline"},{"category":"Language","text":"Google Translate camera feature"}]}
Now expand the days array to include ALL ${days} days with 3 activities each, specific to ${destination}.`;

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({error:"Missing API key"}), {status:500});

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
      max_tokens: 2000,
      stream: false
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
};
