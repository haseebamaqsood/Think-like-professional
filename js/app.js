const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k, d = "") { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
const SYSTEM = "You are a senior social media strategist. Reply with valid JSON only, no markdown fences, no commentary.";

/* ---------- settings ---------- */
$("key").value = store.get("tlp-key");
$("model").value = store.get("tlp-model", "openai/gpt-4o-mini");
let serverKey = false;
function updateMode() {
  $("mode").textContent = serverKey ? "Live AI mode (secure server key)"
    : $("key").value.trim() ? "Live AI mode" : "Demo mode: add an OpenRouter key for live AI";
}
$("key").onchange = () => { store.set("tlp-key", $("key").value.trim()); updateMode(); };
$("model").onchange = () => store.set("tlp-model", $("model").value.trim());
updateMode();
fetch("/api/status").then((r) => r.json()).then((d) => { serverKey = !!d.configured; updateMode(); }).catch(() => {});

/* ---------- helpers ---------- */
const brief = () => ({ topic: $("topic").value.trim(), audience: $("audience").value.trim() || "general audience", tone: $("tone").value });
const briefText = (b) => `Topic: ${b.topic}\nAudience: ${b.audience}\nTone: ${b.tone}`;
function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 1600); }
function showTab(n) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === n));
  document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("active", p.id === n));
}
function card(title, text, cls = "") {
  return `<div class="card ${cls}"><h3>${esc(title)}<button class="copy" data-copy="${esc(text)}">Copy</button></h3><p>${esc(text)}</p></div>`;
}
document.addEventListener("click", (e) => {
  const t = e.target.closest(".tab"); if (t) showTab(t.dataset.tab);
  const c = e.target.closest(".copy");
  if (c) navigator.clipboard.writeText(c.dataset.copy).then(() => toast("Copied"));
});

/* ---------- AI call (OpenRouter) ---------- */
async function ai(prompt) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + $("key").value.trim(), "Content-Type": "application/json" },
    body: JSON.stringify({
      model: $("model").value.trim() || "openai/gpt-4o-mini", temperature: 0.8,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(`AI request failed (${r.status}). Check your API key and model name.`);
  const text = (await r.json()).choices[0].message.content.replace(/```(?:json)?/g, "").trim();
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  return JSON.parse(m ? m[0] : text);
}
async function aiServer(prompt) {
  const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model: $("model").value.trim() }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Server request failed");
  return d;
}
const run = (prompt, demo) => serverKey ? aiServer(prompt) : $("key").value.trim() ? ai(prompt) : Promise.resolve(demo());

async function job(btn, out, fn) {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = "Working...";
  out.innerHTML = '<div class="loading">Creating your content...</div>';
  try { return await fn(); }
  catch (e) { out.innerHTML = `<div class="error">${esc(e.message)}</div>`; return null; }
  finally { btn.disabled = false; btn.textContent = label; }
}

/* ---------- demo mode (works without a key) ---------- */
const words = (s) => s.split(/\W+/).filter((w) => w.length > 3);
const cap = (w) => w[0].toUpperCase() + w.slice(1).toLowerCase();
function demoGenerate(b) {
  const tags = [...new Set(words(b.topic).map((w) => "#" + cap(w)))].slice(0, 5)
    .concat(["#SocialMedia", "#ContentMarketing", "#Branding", "#SmallBusiness", "#GrowthMindset", "#DigitalMarketing", "#MarketingTips", "#Strategy", "#Creators", "#Business"]).slice(0, 15);
  return {
    linkedin: `${b.topic}: here is why it matters.\n\nFor ${b.audience}, the right idea at the right time changes everything. We built this with one goal: make life simpler and better.\n\nThree things to know:\n1. It solves a real problem.\n2. It is made with care.\n3. It is ready for you today.\n\nWhat would you like to see next? Tell us in the comments.`,
    instagram: [
      `✨ ${b.topic}. Made for ${b.audience}. Tap to see more!`,
      `Big news! 🚀 ${b.topic}. Save this post and share it with someone who needs it.`,
      `${b.tone} vibes only 💜 ${b.topic}. Which part is your favorite? Tell us below 👇`,
    ],
    hashtags: tags,
  };
}
function demoRepurpose(post, target) {
  const clean = post.replace(/\s+/g, " ").trim();
  const short = clean.split(" ").slice(0, 35).join(" ");
  const map = {
    "Instagram caption": `✨ ${short}...\n\nSave this for later and share it with a friend! 💬`,
    "X (Twitter) post": clean.length > 240 ? clean.slice(0, 237) + "..." : clean,
    "Facebook post": `Hi everyone! 👋\n\n${short}...\n\nLet us know what you think in the comments.`,
    "Short video script": `HOOK (0-3s): ${short.split(" ").slice(0, 8).join(" ")}...\nBODY (3-20s): ${short}\nCALL TO ACTION (20-30s): Follow for more and share this video.`,
  };
  return { platform: target, content: map[target] };
}
function demoCalendar(b) {
  const t = b.topic;
  const rows = [
    ["Monday", "LinkedIn", "Text post", `Announce: ${t}`, "9:00 AM"],
    ["Tuesday", "Instagram", "Carousel", `3 reasons ${b.audience} will love it`, "12:00 PM"],
    ["Wednesday", "Facebook", "Photo post", "Behind the scenes of the work", "11:00 AM"],
    ["Thursday", "X", "Short thread", `Quick tips related to ${t}`, "10:00 AM"],
    ["Friday", "Instagram", "Reel", "Customer story or quick poll", "6:00 PM"],
    ["Saturday", "Instagram", "Story", "Question box: ask us anything", "1:00 PM"],
    ["Sunday", "LinkedIn", "Article", "Weekly recap and what is next", "5:00 PM"],
  ];
  return { days: rows.map(([day, platform, format, idea, time]) => ({ day, platform, format, idea, time })) };
}

/* ---------- actions ---------- */
$("goGenerate").onclick = async (e) => {
  const b = brief(); if (!b.topic) return toast("Add a topic first");
  showTab("generate"); const out = $("generate");
  const d = await job(e.target, out, () => run(`${briefText(b)}

Return JSON with exactly these keys:
{"linkedin": "one LinkedIn post, 120-180 words, strong first line, short paragraphs, ends with a call to action",
 "instagram": ["3 different Instagram captions, each under 50 words, with emojis and a hook"],
 "hashtags": ["15 hashtags starting with #, mixing popular and niche"]}`, () => demoGenerate(b)));
  if (!d) return;
  const tags = (d.hashtags || []).join(" ");
  out.innerHTML = card("LinkedIn post", d.linkedin, "li") +
    (d.instagram || []).map((c, i) => card(`Instagram caption ${i + 1}`, c, "ig")).join("") +
    `<div class="card tags"><h3>Hashtags<button class="copy" data-copy="${esc(tags)}">Copy all</button></h3>
     <div class="chips">${(d.hashtags || []).map((h) => `<span class="chip">${esc(h)}</span>`).join("")}</div></div>`;
};

$("goRepurpose").onclick = async (e) => {
  const post = $("post").value.trim(); if (!post) return toast("Paste a post first");
  const target = $("target").value, out = $("repurposeOut");
  const d = await job(e.target, out, () => run(`Rewrite this post for ${target}, keeping the same message but matching that platform's length, style and format. Tone: ${$("tone").value}.

POST:
${post}

Return JSON: {"platform": "${target}", "content": "the rewritten post"}`, () => demoRepurpose(post, target)));
  if (d) out.innerHTML = card(d.platform || target, d.content, "rp");
};

$("goCalendar").onclick = async (e) => {
  const b = brief(); if (!b.topic) return toast("Add a topic first");
  showTab("calendar"); const out = $("calendar");
  const d = await job(e.target, out, () => run(`${briefText(b)}

Create a 7-day content calendar (Monday to Sunday). Return JSON:
{"days": [{"day": "Monday", "platform": "LinkedIn", "format": "Text post", "idea": "one-sentence idea", "time": "9:00 AM"}]}
Include exactly 7 entries and vary platforms and formats.`, () => demoCalendar(b)));
  if (!d) return;
  const rows = (d.days || []).map((x) => `<tr><td><b>${esc(x.day)}</b></td>
    <td><span class="badge ${esc(String(x.platform).toLowerCase().split(/[ (]/)[0])}">${esc(x.platform)}</span></td>
    <td>${esc(x.format)}</td><td>${esc(x.idea)}</td><td>${esc(x.time)}</td></tr>`).join("");
  out.innerHTML = `<div class="card scroll"><table><thead><tr><th>Day</th><th>Platform</th><th>Format</th><th>Idea</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table></div>`;
};

/* ---------- themes ---------- */
function setTheme(n) {
  document.documentElement.dataset.theme = n;
  document.querySelectorAll(".themes button").forEach((b) => b.classList.toggle("on", b.dataset.theme === n));
  store.set("tlp-theme", n);
}
document.querySelectorAll(".themes button").forEach((b) => (b.onclick = () => setTheme(b.dataset.theme)));
setTheme(store.get("tlp-theme", "canva"));
