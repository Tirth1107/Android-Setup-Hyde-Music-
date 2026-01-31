from flask import Flask, request, jsonify
from flask_cors import CORS
from base64 import b64encode
import requests
from youtubesearchpython import VideosSearch
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')

def get_spotify_token():
    if not CLIENT_ID or not CLIENT_SECRET:
        return None
        
    url = "https://accounts.spotify.com/api/token"
    auth_header = {
        "Authorization": "Basic " + b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    }
    data = {"grant_type": "client_credentials"}
    res = requests.post(url, headers=auth_header, data=data)
    return res.json().get("access_token")

@app.route("/search", methods=["GET"])
def search_tracks():
    query = request.args.get("q")
    token = get_spotify_token()
    if not token:
        return jsonify({"error": "Token error"}), 401

    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": query, "type": "track", "limit": 50}
    res = requests.get("https://api.spotify.com/v1/search", headers=headers, params=params)

    if res.status_code != 200:
        return jsonify({"error": "Spotify failed"}), 500

    tracks = res.json().get("tracks", {}).get("items", [])
    results = []
    for track in tracks:
        yt_query = f"{track['name']} {track['artists'][0]['name']} audio"
        yt_result = VideosSearch(yt_query, limit=1).result()
        yt_id = yt_result["result"][0]["id"] if yt_result["result"] else None

        results.append({
            "name": track["name"],
            "artists": [a["name"] for a in track["artists"]],
            "album": track["album"]["name"],
            "image": track["album"]["images"][0]["url"],
            "youtube_id": yt_id
        })

    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True)
