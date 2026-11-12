# Think Like Professional: AI Social Media Studio

HTML + CSS + JavaScript frontend with a Python (Flask) `app.py` server.

## Run with app.py (VS Code)
1. Open this folder in VS Code and open a terminal.
2. Create a virtual environment: `python -m venv venv`
   then activate it: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
3. Install packages: `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and paste your OpenRouter key (optional: leave it empty for demo mode).
5. Start the server: `python app.py`
6. Open http://127.0.0.1:5000

## Modes
- Key in `.env`: live AI, key stays private on the server.
- No key anywhere: demo mode with template content.
- No server (opening index.html directly): paste a key in "AI connection" for live AI.

## Files
- `app.py`: Flask server and secure AI route
- `index.html`, `css/style.css`, `js/app.js`: the app
