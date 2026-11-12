import os, re, json, logging, requests
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()  # reads .env locally; on Render the dashboard variables are used
BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)  # only the routes below are public
app.logger.setLevel(logging.INFO)

API_KEY = os.getenv("OPENROUTER_API_KEY")
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
# Comma-separated list of models the site may use; anything else falls back to the default
ALLOWED_MODELS = {m.strip() for m in os.getenv("ALLOWED_MODELS", DEFAULT_MODEL).split(",") if m.strip()}
ALLOWED_MODELS.add(DEFAULT_MODEL)
MAX_PROMPT_CHARS = 8000
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


@app.get("/healthz")
def healthz():
    # Render uses this to check that the app is alive
    return "ok", 200


@app.get("/api/status")
def status():
    # Tells the page whether a secure server-side key is configured
    return jsonify({"configured": bool(API_KEY)})


@app.post("/api/ai")
def ai():
    if not API_KEY:
        app.logger.error("OPENROUTER_API_KEY is not set")
        return jsonify({"error": "Server is not configured yet. Please try again later."}), 500

    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    if not prompt:
        return jsonify({"error": "Prompt is required."}), 400
    if len(prompt) > MAX_PROMPT_CHARS:
        return jsonify({"error": "Prompt is too long."}), 400

    model = data.get("model")
    if model not in ALLOWED_MODELS:
        model = DEFAULT_MODEL

    try:
        r = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={"model": model, "temperature": 0.8,
                  "messages": [{"role": "system", "content": SYSTEM},
                               {"role": "user", "content": prompt}]},
            timeout=90,
        )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        text = re.sub(r"```(?:json)?", "", text).strip()
        m = re.search(r"[\[{].*[\]}]", text, re.S)
        return jsonify(json.loads(m.group(0) if m else text))
    except requests.Timeout:
        return jsonify({"error": "The AI took too long to respond. Please try again."}), 504
    except Exception:
        app.logger.exception("AI request failed")  # full details go to Render's logs only
        return jsonify({"error": "AI request failed. Please try again."}), 502


if __name__ == "__main__":
    # Local development only. On Render, Gunicorn starts the app instead.
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")