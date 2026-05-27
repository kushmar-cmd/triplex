export default async (req, context) => {
  const apiKey = Netlify.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return new Response("NO KEY", {status:500});
  
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-8b-instruct:free",


      messages: [{ role: "user", content: "say hi" }]
    })
  });
  
  const text = await r.text();
  return new Response(`STATUS:${r.status} BODY:${text}`);
};

export const config = { path: "/api/plan" };
