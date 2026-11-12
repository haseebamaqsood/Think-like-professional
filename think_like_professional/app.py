import os, re, json, requests
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()
BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)  # only the routes below are public

API_KEY = os.getenv("OPENROUTER_API_KEY")
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
SYSTEM = ("You are a senior social media strategist. Reply with valid JSON only, "
          "no markdown fences, no commentary.")


@app.route("/")
def home():
    return send_from_directory(BASE, "index.html")


@app.route("/css/<path:name>")
def css(name):
    return send_from_directory(os.path.join(BASE, "css"), name)

@app.route("/js/<path:name>")
def js(name):
    return send_from_directory(os.path.join(BASE, "js"), name)


@app.get("/api/status")
def status():
    # Tells the page whether a secure server-side key is configured
    return jsonify({"configured": bool(API_KEY)})


@app.post("/api/ai")
def ai():
    if not API_KEY:
        return jsonify({"error": "Server key missing. Add OPENROUTER_API_KEY to .env"}), 500
    try:
        data = request.get_json(force=True)
        r = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={"model": data.get("model") or DEFAULT_MODEL, "temperature": 0.8,
                  "messages": [{"role": "system", "content": SYSTEM},
                               {"role": "user", "content": data.get("prompt", "")}]},
            timeout=90,
        )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        text = re.sub(r"```(?:json)?", "", text).strip()
        m = re.search(r"[\[{].*[\]}]", text, re.S)
        return jsonify(json.loads(m.group(0) if m else text))
    except Exception as e:
        return jsonify({"error": f"AI request failed: {e}"}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
