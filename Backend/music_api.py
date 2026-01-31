import os
import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import logging
from urllib.parse import quote_plus

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enable CORS for all routes with specific production-ready settings
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "*"],
        "allow_headers": ["Content-Type", "X-HYDE-API-KEY"],
        "methods": ["GET", "POST", "OPTIONS"],
        "expose_headers": ["Content-Type", "X-HYDE-API-KEY"]
    }
})

# Security Configuration
HYDE_API_KEY = os.getenv("HYDE_API_KEY", "hyde-api-key-2026")

def require_api_key(f):
    def decorated(*args, **kwargs):
        # 1. Skip API key for preflight OPTIONS requests (Required for CORS)
        if request.method == "OPTIONS":
            return "", 200
            
        # 2. Check for the Hyde API Key
        api_key = request.headers.get("X-HYDE-API-KEY")
        if api_key != HYDE_API_KEY:
            logger.warning(f"Unauthorized access attempt from {request.remote_addr}")
            return jsonify({"error": "Unauthorized"}), 401
            
        return f(*args, **kwargs)
    decorated.__name__ = f.__name__
    return decorated

def format_track_ytdlp(entry):
    """Formats raw yt-dlp entry into the standardized track object."""
    video_id = entry.get('id')
    if not video_id:
        return None
    return {
        "id": f"youtube_{video_id}",
        "name": entry.get("title", "Unknown Title"),
        "artists": ["YouTube"],
        "album": "YouTube Music",
        "image": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        "youtube_id": video_id,
        "duration": int(entry.get("duration", 0)) * 1000,
        "source": "youtube"
    }

def ytdlp_search(query, limit=10):
    """Reliable YouTube search using yt-dlp's built-in search service."""
    ydl_opts = {
        'format': 'bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'skip_download': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            data = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
            entries = data.get('entries', [])
            tracks = [format_track_ytdlp(entry) for entry in entries if entry]
            return [t for t in tracks if t]
    except Exception as e:
        logger.error(f"yt-dlp search error for query '{query}': {str(e)}")
        raise e

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "Hyde Music API running", "engine": "yt-dlp native search"})

@app.route("/search", methods=["GET", "OPTIONS"])
@require_api_key
def search():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Query parameter 'q' is required"}), 400

    logger.info(f"YTDLP GET Search: {query}")
    try:
        tracks = ytdlp_search(query)
        return jsonify(tracks)
    except Exception:
        return jsonify({"error": "Failed to search music"}), 500

@app.route("/search_music", methods=["POST", "OPTIONS"])
@require_api_key
def search_music():
    data = request.json
    if not data or "query" not in data:
        return jsonify({"error": "JSON body with 'query' is required"}), 400
    
    query = data.get("query")
    logger.info(f"YTDLP POST Search: {query}")
    try:
        tracks = ytdlp_search(query)
        return jsonify({"tracks": tracks})
    except Exception:
        return jsonify({"error": "Failed to search music"}), 500

@app.route("/suggestions", methods=["GET", "OPTIONS"])
@require_api_key
def get_suggestions():
    query = request.args.get("q", "")
    if not query:
        return jsonify([])
    
    logger.info(f"Fetching suggestions for: {query}")
    try:
        url = f"https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&client=firefox&q={quote_plus(query)}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            data = json.loads(response.text)
            if len(data) > 1:
                return jsonify(data[1])
        return jsonify([])
    except Exception as e:
        logger.error(f"Suggestions error: {e}")
        return jsonify([])

@app.route("/stream", methods=["GET", "OPTIONS"])
@require_api_key
def stream():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "URL parameter 'url' is required"}), 400

    logger.info(f"Extracting stream for: {url}")
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return jsonify({
                "title": info.get("title"),
                "stream_url": info.get("url")
            })
    except Exception as e:
        logger.error(f"Stream extraction error: {str(e)}")
        return jsonify({"error": "Failed to extract stream"}), 500

@app.route("/trending_music", methods=["GET", "OPTIONS"])
@require_api_key
def trending_music():
    logger.info("Fetching trending music via YTDLP")
    try:
        tracks = ytdlp_search("top trending music 2026", limit=10)
        return jsonify({"tracks": tracks})
    except Exception:
        return jsonify({"tracks": []})

@app.route("/get_related_songs", methods=["POST", "OPTIONS"])
@require_api_key
def get_related_songs():
    data = request.json
    track_name = data.get("track_name", "")
    artist_name = data.get("artist_name", "")
    query = f"{track_name} {artist_name} mix"
    try:
        tracks = ytdlp_search(query, limit=8)
        return jsonify({"tracks": tracks, "has_more": False})
    except Exception:
        return jsonify({"tracks": [], "has_more": False})

@app.route("/get_ai_recommendations", methods=["POST", "OPTIONS"])
@require_api_key
def get_ai_recommendations():
    return trending_music()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
