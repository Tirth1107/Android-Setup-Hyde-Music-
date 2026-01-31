from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
import logging
import json
import time
from base64 import b64encode
import requests
import os
import yt_dlp
from dotenv import load_dotenv
import urllib.parse
import re
from functools import lru_cache
import urllib3
from urllib.parse import quote_plus
from concurrent.futures import ThreadPoolExecutor, as_completed

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create downloads folder if it doesn't exist
os.makedirs('downloads', exist_ok=True)

# Dynamic music data based on search queries
MUSIC_DATABASE = {
    "trending": [
        {
            "name": "Flowers",
            "artists": ["Miley Cyrus"],
            "album": "Endless Summer Vacation",
            "image": "https://img.youtube.com/vi/G7KNmW9a75Y/hqdefault.jpg",
            "youtube_id": "G7KNmW9a75Y",
            "duration": 200000,
            "source": "youtube"
        },
        {
            "name": "Anti-Hero",
            "artists": ["Taylor Swift"],
            "album": "Midnights",
            "image": "https://img.youtube.com/vi/b1kbLWvqugk/hqdefault.jpg",
            "youtube_id": "b1kbLWvqugk",
            "duration": 201000,
            "source": "youtube"
        },
        {
            "name": "As It Was",
            "artists": ["Harry Styles"],
            "album": "Harry's House",
            "image": "https://img.youtube.com/vi/H5v3kku4y6Q/hqdefault.jpg",
            "youtube_id": "H5v3kku4y6Q",
            "duration": 167000,
            "source": "youtube"
        }
    ],
    "chill": [
        {
            "name": "Lofi Hip Hop Radio",
            "artists": ["ChilledCow"],
            "album": "Lofi Collection",
            "image": "https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg",
            "youtube_id": "jfKfPfyJRdk",
            "duration": 3600000,
            "source": "youtube"
        },
        {
            "name": "Weightless",
            "artists": ["Marconi Union"],
            "album": "Ambient Works",
            "image": "https://img.youtube.com/vi/UfcAVejslrU/hqdefault.jpg",
            "youtube_id": "UfcAVejslrU",
            "duration": 485000,
            "source": "youtube"
        },
        {
            "name": "River Flows in You",
            "artists": ["Yiruma"],
            "album": "First Love",
            "image": "https://img.youtube.com/vi/7maJOI3QMu0/hqdefault.jpg",
            "youtube_id": "7maJOI3QMu0",
            "duration": 180000,
            "source": "youtube"
        }
    ],
    "coding": [
        {
            "name": "Synthwave Programming Mix",
            "artists": ["The Midnight"],
            "album": "Coding Beats",
            "image": "https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg",
            "youtube_id": "4xDzrJKXOOY",
            "duration": 3600000,
            "source": "youtube"
        },
        {
            "name": "Focus Flow",
            "artists": ["Brain.fm"],
            "album": "Deep Work",
            "image": "https://img.youtube.com/vi/kgx4WGK0oNU/hqdefault.jpg",
            "youtube_id": "kgx4WGK0oNU",
            "duration": 1800000,
            "source": "youtube"
        },
        {
            "name": "Cyberpunk 2077 OST",
            "artists": ["Marcin Przybyłowicz"],
            "album": "Game Soundtrack",
            "image": "https://img.youtube.com/vi/P4kemWzNcx4/hqdefault.jpg",
            "youtube_id": "P4kemWzNcx4",
            "duration": 240000,
            "source": "youtube"
        }
    ],
    "popular": [
        {
            "name": "Blinding Lights",
            "artists": ["The Weeknd"],
            "album": "After Hours",
            "image": "https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg",
            "youtube_id": "4NRXx6U8ABQ",
            "duration": 200000,
            "source": "youtube"
        },
        {
            "name": "Shape of You",
            "artists": ["Ed Sheeran"],
            "album": "÷ (Divide)",
            "image": "https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg",
            "youtube_id": "JGwWNGJdvx8",
            "duration": 233000,
            "source": "youtube"
        },
        {
            "name": "Bad Guy",
            "artists": ["Billie Eilish"],
            "album": "When We All Fall Asleep, Where Do We Go?",
            "image": "https://img.youtube.com/vi/DyDfgMOUjCI/hqdefault.jpg",
            "youtube_id": "DyDfgMOUjCI",
            "duration": 194000,
            "source": "youtube"
        }
    ]
}

def search_youtube_music(query, limit=5):
    """Search YouTube for any music using web scraping"""
    try:
        logger.info(f"Searching YouTube for: {query}")
        
        # Clean and encode the search query
        search_query = f"{query} music"
        encoded_query = quote_plus(search_query)
        search_url = f"https://www.youtube.com/results?search_query={encoded_query}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        response = requests.get(search_url, headers=headers, timeout=10, verify=False)
        logger.info(f"YouTube response status: {response.status_code}")
        
        if response.status_code == 200:
            content = response.text
            logger.info(f"Response content length: {len(content)}")
            
            # Multiple regex patterns to catch different YouTube formats
            patterns = [
                r'"videoId":"([a-zA-Z0-9_-]{11})"[^}]*"title":\{"runs":\[\{"text":"([^"]+)"[^}]*\}[^}]*"lengthText":\{"simpleText":"([^"]+)"',
                r'"videoId":"([a-zA-Z0-9_-]{11})"[^}]*"title":\{"simpleText":"([^"]+)"[^}]*"lengthText":\{"simpleText":"([^"]+)"',
                r'"videoId":"([a-zA-Z0-9_-]{11})".*?"text":"([^"]+)".*?"lengthText".*?"simpleText":"([^"]+)"',
                r'{"videoId":"([a-zA-Z0-9_-]{11})".*?"title":{"runs":\[{"text":"([^"]+)"}.*?"lengthText":{"simpleText":"([^"]+)"}',
            ]
            
            results = []
            seen_video_ids = set()  # Track seen video IDs to prevent duplicates
            
            for pattern in patterns:
                matches = re.findall(pattern, content, re.DOTALL)
                logger.info(f"Pattern found {len(matches)} matches")
                
                if matches:
                    for i, match in enumerate(matches):
                        if len(match) >= 3 and len(results) < limit:
                            video_id, title, duration = match[0], match[1], match[2]
                            
                            # Skip if we've already seen this video ID
                            if video_id in seen_video_ids:
                                continue
                            seen_video_ids.add(video_id)
                            
                            # Clean title
                            clean_title = title.replace('\\u0026', '&').replace('\\"', '"').replace('\\/', '/').replace('\\u003c', '<').replace('\\u003e', '>')
                            
                            # Enhanced artist and song extraction with better logic
                            artist = "Unknown Artist"
                            song_name = clean_title
                            
                            logger.info(f"Processing title: {clean_title}")
                            
                            # Improved parsing logic with multiple strategies
                            if ' - ' in clean_title:
                                parts = clean_title.split(' - ', 1)
                                if len(parts) == 2:
                                    # Check which part is more likely to be the song
                                    first_part = parts[0].strip()
                                    second_part = parts[1].strip()
                                    
                                    # If first part contains query, it's likely the song
                                    if query.lower() in first_part.lower():
                                        song_name = first_part
                                        artist = second_part
                                    else:
                                        artist = first_part
                                        song_name = second_part
                                    logger.info(f"Parsed with ' - ': artist={artist}, song={song_name}")
                            elif ' | ' in clean_title:
                                parts = clean_title.split(' | ')
                                if len(parts) >= 2:
                                    # First part is usually the song, second is artist
                                    song_name = parts[0].strip()
                                    artist = parts[1].strip()
                                    logger.info(f"Parsed with ' | ': artist={artist}, song={song_name}")
                            elif ' by ' in clean_title.lower():
                                by_index = clean_title.lower().find(' by ')
                                if by_index != -1:
                                    song_name = clean_title[:by_index].strip()
                                    artist = clean_title[by_index + 4:].strip()
                                    logger.info(f"Parsed with ' by ': artist={artist}, song={song_name}")
                            elif '(' in clean_title and ')' in clean_title:
                                # Extract artist from parentheses if present
                                paren_match = re.search(r'\(([^)]+)\)', clean_title)
                                if paren_match:
                                    potential_artist = paren_match.group(1).strip()
                                    if not any(word in potential_artist.lower() for word in ['official', 'video', 'audio', 'lyrics', 'music', 'ft', 'feat']):
                                        artist = potential_artist
                                        song_name = clean_title.replace(f'({potential_artist})', '').strip()
                                        logger.info(f"Parsed with parentheses: artist={artist}, song={song_name}")
                            
                            # Additional fallback: try to extract from common patterns
                            if artist == "Unknown Artist":
                                # Try patterns like "Artist Name - Song Title (Official Video)"
                                title_patterns = [
                                    r'^([^-]+)\s*-\s*([^(]+)',  # Artist - Song
                                    r'^([^|]+)\s*\|\s*([^(]+)',  # Artist | Song
                                    r'([^-]+)\s*-\s*(.+)',      # Fallback Artist - Song
                                ]
                                
                                for pattern in title_patterns:
                                    match = re.match(pattern, clean_title)
                                    if match:
                                        potential_artist = match.group(1).strip()
                                        potential_song = match.group(2).strip()
                                        
                                        # Validate that it's not just metadata
                                        if not any(word in potential_artist.lower() for word in ['official', 'video', 'audio', 'lyrics', 'hd', '4k']):
                                            artist = potential_artist
                                            song_name = potential_song
                                            logger.info(f"Parsed with regex pattern: artist={artist}, song={song_name}")
                                            break
                            
                            # Final fallback: use query as song name if no good parsing found
                            if artist == "Unknown Artist" and query:
                                song_name = query
                                # Try to extract artist from remaining title
                                remaining = clean_title.replace(query, '').strip()
                                if remaining and len(remaining) > 2:
                                    # Clean up common prefixes/suffixes
                                    remaining = re.sub(r'^[-|•·\s]+|[-|•·\s]+$', '', remaining)
                                    if remaining and not any(word in remaining.lower() for word in ['official', 'video', 'audio', 'lyrics', 'music']):
                                        artist = remaining
                                        logger.info(f"Fallback parsing: artist={artist}, song={song_name}")
                            
                            # Ensure we always have an artist name
                            if not artist or artist.strip() == "":
                                artist = "Unknown Artist"
                            
                            # Clean up common suffixes from song names
                            suffixes_to_remove = [
                                '(Official Video)', '(Official Audio)', '(Official Music Video)',
                                '(Lyrics)', '(Lyric Video)', '[Official Video]', '[Official Audio]',
                                '- Official Video', '- Official Audio', '| Official Video',
                                '(Full Video)', '(HD)', '[HD]', '(4K)', '[4K]', '(Official)'
                            ]
                            for suffix in suffixes_to_remove:
                                if suffix in song_name:
                                    song_name = song_name.replace(suffix, '').strip()
                            
                            # Calculate relevance score for sorting
                            relevance_score = 0
                            query_lower = query.lower()
                            song_lower = song_name.lower()
                            artist_lower = artist.lower()
                            
                            # Exact match gets highest score
                            if query_lower == song_lower:
                                relevance_score = 100
                            elif query_lower in song_lower:
                                relevance_score = 80
                            elif any(word in song_lower for word in query_lower.split()):
                                relevance_score = 60
                            elif query_lower in artist_lower:
                                relevance_score = 40
                            else:
                                relevance_score = 20
                            
                            # Parse duration
                            duration_seconds = 180  # Default
                            if ':' in duration:
                                try:
                                    time_parts = duration.split(':')
                                    if len(time_parts) == 2:
                                        duration_seconds = int(time_parts[0]) * 60 + int(time_parts[1])
                                    elif len(time_parts) == 3:
                                        duration_seconds = int(time_parts[0]) * 3600 + int(time_parts[1]) * 60 + int(time_parts[2])
                                except:
                                    duration_seconds = 180
                            
                            results.append({
                                "id": f"youtube_{video_id}",
                                "name": song_name,
                                "artists": [artist],
                                "album": "YouTube Music",
                                "image": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                                "youtube_id": video_id,
                                "duration": duration_seconds * 1000,
                                "source": "youtube",
                                "relevance_score": relevance_score
                            })
                    
                    if results:
                        break
            
            # Sort by relevance score (highest first)
            results.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
            
            # Remove relevance_score from final results
            for result in results:
                result.pop('relevance_score', None)
            
            if results:
                logger.info(f"Successfully found {len(results)} unique tracks, sorted by relevance")
                return results
            else:
                logger.warning("No tracks found with any pattern, trying fallback search")
                # Fallback: simpler search without duration
                simple_pattern = r'"videoId":"([a-zA-Z0-9_-]{11})"'
                video_ids = re.findall(simple_pattern, content)
                
                if video_ids:
                    fallback_results = []
                    seen_fallback_ids = set()
                    for i, video_id in enumerate(video_ids[:limit]):
                        if video_id not in seen_fallback_ids:
                            seen_fallback_ids.add(video_id)
                            fallback_results.append({
                                "id": f"youtube_{video_id}",
                                "name": f"Search Result {len(fallback_results)+1}",
                                "artists": ["YouTube"],
                                "album": "Search Results",
                                "image": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                                "youtube_id": video_id,
                                "duration": 180000,
                                "source": "youtube"
                            })
                    logger.info(f"Fallback search found {len(fallback_results)} unique video IDs")
                    return fallback_results
        
        logger.error("All search methods failed")
        return []
        
    except Exception as e:
        logger.error(f"YouTube search failed with error: {e}")
        return []

def get_trending_music():
    """Get trending music"""
    return MUSIC_DATABASE['trending']

def get_fallback_shuffle_playlist():
    """Fallback shuffle playlist"""
    try:
        logger.info("Using fallback shuffle playlist")
        
        # Curated diverse shuffle playlist
        fallback_tracks = [
            {"id": "youtube_G7KNmW9a75Y", "name": "Flowers", "artists": ["Miley Cyrus"], "album": "Endless Summer Vacation", "image": "https://img.youtube.com/vi/G7KNmW9a75Y/hqdefault.jpg", "youtube_id": "G7KNmW9a75Y", "duration": 200000, "source": "youtube"},
            {"id": "youtube_b1kbLWvqugk", "name": "Anti-Hero", "artists": ["Taylor Swift"], "album": "Midnights", "image": "https://img.youtube.com/vi/b1kbLWvqugk/hqdefault.jpg", "youtube_id": "b1kbLWvqugk", "duration": 201000, "source": "youtube"},
            {"id": "youtube_H5v3kku4y6Q", "name": "As It Was", "artists": ["Harry Styles"], "album": "Harry's House", "image": "https://img.youtube.com/vi/H5v3kku4y6Q/hqdefault.jpg", "youtube_id": "H5v3kku4y6Q", "duration": 167000, "source": "youtube"},
            {"id": "youtube_4NRXx6U8ABQ", "name": "Blinding Lights", "artists": ["The Weeknd"], "album": "After Hours", "image": "https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg", "youtube_id": "4NRXx6U8ABQ", "duration": 200000, "source": "youtube"},
            {"id": "youtube_JGwWNGJdvx8", "name": "Shape of You", "artists": ["Ed Sheeran"], "album": "÷ (Divide)", "image": "https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg", "youtube_id": "JGwWNGJdvx8", "duration": 233000, "source": "youtube"},
            {"id": "youtube_DyDfgMOUjCI", "name": "Bad Guy", "artists": ["Billie Eilish"], "album": "When We All Fall Asleep, Where Do We Go?", "image": "https://img.youtube.com/vi/DyDfgMOUjCI/hqdefault.jpg", "youtube_id": "DyDfgMOUjCI", "duration": 194000, "source": "youtube"},
            {"id": "youtube_fJ9rUzIMcZQ", "name": "Bohemian Rhapsody", "artists": ["Queen"], "album": "A Night at the Opera", "image": "https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg", "youtube_id": "fJ9rUzIMcZQ", "duration": 355000, "source": "youtube"},
            {"id": "youtube_hTWKbfoikeg", "name": "Smells Like Teen Spirit", "artists": ["Nirvana"], "album": "Nevermind", "image": "https://img.youtube.com/vi/hTWKbfoikeg/hqdefault.jpg", "youtube_id": "hTWKbfoikeg", "duration": 301000, "source": "youtube"},
            {"id": "youtube_OPf0YbXqDm0", "name": "Uptown Funk", "artists": ["Mark Ronson", "Bruno Mars"], "album": "Uptown Special", "image": "https://img.youtube.com/vi/OPf0YbXqDm0/hqdefault.jpg", "youtube_id": "OPf0YbXqDm0", "duration": 270000, "source": "youtube"},
            {"id": "youtube_09R8_2nJtjg", "name": "Sugar", "artists": ["Maroon 5"], "album": "V", "image": "https://img.youtube.com/vi/09R8_2nJtjg/hqdefault.jpg", "youtube_id": "09R8_2nJtjg", "duration": 235000, "source": "youtube"},
            {"id": "youtube_YQHsXMglC9A", "name": "Hello", "artists": ["Adele"], "album": "25", "image": "https://img.youtube.com/vi/YQHsXMglC9A/hqdefault.jpg", "youtube_id": "YQHsXMglC9A", "duration": 295000, "source": "youtube"},
            {"id": "youtube_My2FRPA3Gf8", "name": "Wrecking Ball", "artists": ["Miley Cyrus"], "album": "Bangerz", "image": "https://img.youtube.com/vi/My2FRPA3Gf8/hqdefault.jpg", "youtube_id": "My2FRPA3Gf8", "duration": 221000, "source": "youtube"},
            {"id": "youtube_dQw4w9WgXcQ", "name": "Never Gonna Give You Up", "artists": ["Rick Astley"], "album": "Whenever You Need Somebody", "image": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "youtube_id": "dQw4w9WgXcQ", "duration": 213000, "source": "youtube"},
            {"id": "youtube_nfWlot6h_JM", "name": "Shake It Off", "artists": ["Taylor Swift"], "album": "1989", "image": "https://img.youtube.com/vi/nfWlot6h_JM/hqdefault.jpg", "youtube_id": "nfWlot6h_JM", "duration": 219000, "source": "youtube"},
            {"id": "youtube_CevxZvSJLk8", "name": "Roar", "artists": ["Katy Perry"], "album": "Prism", "image": "https://img.youtube.com/vi/CevxZvSJLk8/hqdefault.jpg", "youtube_id": "CevxZvSJLk8", "duration": 223000, "source": "youtube"},
            {"id": "youtube_QYh6mYIJG2Y", "name": "7 rings", "artists": ["Ariana Grande"], "album": "thank u, next", "image": "https://img.youtube.com/vi/QYh6mYIJG2Y/hqdefault.jpg", "youtube_id": "QYh6mYIJG2Y", "duration": 178000, "source": "youtube"},
            {"id": "youtube_hT_nvWreIhg", "name": "Counting Stars", "artists": ["OneRepublic"], "album": "Native", "image": "https://img.youtube.com/vi/hT_nvWreIhg/hqdefault.jpg", "youtube_id": "hT_nvWreIhg", "duration": 257000, "source": "youtube"},
            {"id": "youtube_9bZkp7q19f0", "name": "Gangnam Style", "artists": ["PSY"], "album": "PSY 6 (Six Rules), Part 1", "image": "https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg", "youtube_id": "9bZkp7q19f0", "duration": 253000, "source": "youtube"},
            {"id": "youtube_kJQP7kiw5Fk", "name": "Despacito", "artists": ["Luis Fonsi", "Daddy Yankee"], "album": "Vida", "image": "https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg", "youtube_id": "kJQP7kiw5Fk", "duration": 281000, "source": "youtube"},
            {"id": "youtube_jfKfPfyJRdk", "name": "Lofi Hip Hop Radio", "artists": ["ChilledCow"], "album": "Lofi Collection", "image": "https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg", "youtube_id": "jfKfPfyJRdk", "duration": 3600000, "source": "youtube"},
            {"id": "youtube_UfcAVejslrU", "name": "Weightless", "artists": ["Marconi Union"], "album": "Ambient Works", "image": "https://img.youtube.com/vi/UfcAVejslrU/hqdefault.jpg", "youtube_id": "UfcAVejslrU", "duration": 485000, "source": "youtube"},
            {"id": "youtube_7maJOI3QMu0", "name": "River Flows in You", "artists": ["Yiruma"], "album": "First Love", "image": "https://img.youtube.com/vi/7maJOI3QMu0/hqdefault.jpg", "youtube_id": "7maJOI3QMu0", "duration": 180000, "source": "youtube"},
            {"id": "youtube_RBumgq5yVrA", "name": "Let Her Go", "artists": ["Passenger"], "album": "All the Little Lights", "image": "https://img.youtube.com/vi/RBumgq5yVrA/hqdefault.jpg", "youtube_id": "RBumgq5yVrA", "duration": 252000, "source": "youtube"},
            {"id": "youtube_4xDzrJKXOOY", "name": "Synthwave Programming Mix", "artists": ["The Midnight"], "album": "Coding Beats", "image": "https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg", "youtube_id": "4xDzrJKXOOY", "duration": 3600000, "source": "youtube"}
        ]
        
        logger.info(f"Returning {len(fallback_tracks)} fallback shuffle tracks")
        
        return jsonify({
            "tracks": fallback_tracks,
            "total": len(fallback_tracks)
        })
        
    except Exception as e:
        logger.error(f"Fallback shuffle playlist error: {e}")
        return jsonify({"error": "Failed to generate shuffle playlist"}), 500

def get_fallback_recommendations():
    """Fallback recommendations"""
    try:
        logger.info("Using fallback recommendations")
        
        # Mix of popular tracks from different categories
        all_tracks = [
            {"id": "youtube_dQw4w9WgXcQ", "name": "Never Gonna Give You Up", "artists": ["Rick Astley"], "album": "Whenever You Need Somebody", "image": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "youtube_id": "dQw4w9WgXcQ", "duration": 213000, "source": "youtube"},
            {"id": "youtube_9bZkp7q19f0", "name": "Gangnam Style", "artists": ["PSY"], "album": "PSY 6 (Six Rules), Part 1", "image": "https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg", "youtube_id": "9bZkp7q19f0", "duration": 253000, "source": "youtube"},
            {"id": "youtube_kJQP7kiw5Fk", "name": "Despacito", "artists": ["Luis Fonsi", "Daddy Yankee"], "album": "Vida", "image": "https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg", "youtube_id": "kJQP7kiw5Fk", "duration": 281000, "source": "youtube"},
            {"id": "youtube_Pkh8UtuejGw", "name": "Senorita", "artists": ["Shawn Mendes", "Camila Cabello"], "album": "Senorita", "image": "https://img.youtube.com/vi/Pkh8UtuejGw/hqdefault.jpg", "youtube_id": "Pkh8UtuejGw", "duration": 191000, "source": "youtube"},
            {"id": "youtube_jfKfPfyJRdk", "name": "Lofi Hip Hop Radio", "artists": ["ChilledCow"], "album": "Lofi Collection", "image": "https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg", "youtube_id": "jfKfPfyJRdk", "duration": 3600000, "source": "youtube"},
            {"id": "youtube_UfcAVejslrU", "name": "Weightless", "artists": ["Marconi Union"], "album": "Ambient Works", "image": "https://img.youtube.com/vi/UfcAVejslrU/hqdefault.jpg", "youtube_id": "UfcAVejslrU", "duration": 485000, "source": "youtube"}
        ]
        
        # Add tracks from MUSIC_DATABASE
        for category in MUSIC_DATABASE.values():
            all_tracks.extend(category)
        
        # Return first 25 unique tracks
        seen_ids = set()
        fallback_tracks = []
        for track in all_tracks:
            if track['id'] not in seen_ids and len(fallback_tracks) < 25:
                seen_ids.add(track['id'])
                fallback_tracks.append(track)
        
        logger.info(f"Returning {len(fallback_tracks)} fallback recommendations")
        return jsonify({"tracks": fallback_tracks})
        
    except Exception as e:
        logger.error(f"Fallback recommendations error: {e}")
        return jsonify({"error": "Failed to get recommendations"}), 500

# Flask App
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5001", "http://127.0.0.1:5001"], 
     allow_headers=["Content-Type", "Authorization"], 
     methods=["GET", "POST", "OPTIONS"])  # Enable CORS for all routes

@app.route("/search_music", methods=["POST", "OPTIONS"])
def search_music():
    if request.method == "OPTIONS":
        return "", 200
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        logger.info(f"Searching YouTube Music for: {query}")
        
        # Search YouTube Music
        results = search_youtube_music(query, limit=5)
        
        logger.info(f"Found {len(results)} tracks")
        logger.info(f"Returning tracks: {[track['name'] for track in results]}")
        
        return jsonify({"tracks": results})
        
    except Exception as e:
        logger.error(f"Music search error: {e}")
        return jsonify({"error": "Failed to search music"}), 500

@app.route("/trending_music", methods=["GET"])
def trending_music():
    try:
        logger.info("Fetching trending music")
        results = get_trending_music()
        return jsonify({"tracks": results})
    except Exception as e:
        logger.error(f"Trending music error: {e}")
        return jsonify({"error": "Failed to fetch trending music"}), 500

@app.route("/suggestions", methods=["GET"])
def get_suggestions():
    try:
        query = request.args.get("q", "").strip()
        if not query:
            return jsonify([])
        
        # YouTube Google Suggest API
        url = f"http://suggestqueries.google.com/complete/search?client=youtube&ds=yt&client=firefox&q={quote_plus(query)}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
        
        response = requests.get(url, headers=headers, timeout=5, verify=False)
        if response.status_code == 200:
            suggestions = json.loads(response.text)[1]
            return jsonify(suggestions)
        return jsonify([])
    except Exception as e:
        logger.error(f"Suggestions error: {e}")
        return jsonify([])

@app.route("/search", methods=["GET"])
def search_tracks():
    try:
        query = request.args.get("q")
        if not query:
            logger.error("No query parameter provided")
            return jsonify({"error": "Query parameter 'q' is required"}), 400
        
        # Search YouTube Music
        results = search_youtube_music(query, limit=5)
        
        logger.info(f"Found {len(results)} tracks")
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Music search error: {e}")
        return jsonify({"error": "Failed to search music"}), 500

@app.route("/get_related_songs", methods=["POST", "OPTIONS"])
def get_related_songs():
    if request.method == "OPTIONS":
        return "", 200
    try:
        data = request.get_json()
        track_name = data.get('track_name', '').strip()
        artist_name = data.get('artist_name', '').strip()
        page = data.get('page', 0)
        limit = data.get('limit', 5)
        
        if not track_name:
            return jsonify({"error": "Track name is required"}), 400
        
        # Create a search query combining track and artist
        search_query = f"{track_name} {artist_name}".strip()
        logger.info(f"Searching for related songs: {search_query}")
        
        # Search for related songs
        results = search_youtube_music(search_query, limit=limit)
        
        return jsonify({
            "tracks": results,
            "has_more": len(results) >= limit,
            "total_available": len(results)
        })
        
    except Exception as e:
        logger.error(f"Related songs error: {e}")
        return jsonify({"error": "Failed to fetch related songs"}), 500

@app.route("/get_shuffle_songs", methods=["POST", "OPTIONS"])
def get_shuffle_songs():
    if request.method == "OPTIONS":
        return "", 200
    try:
        # Fallback to curated shuffle playlist (AI removed)
        return get_fallback_shuffle_playlist()
        
    except Exception as e:
        logger.error(f"Shuffle songs error: {e}")
        return jsonify({"error": "Failed to generate shuffle songs"}), 500

@app.route("/get_ai_recommendations", methods=["POST", "OPTIONS"])
def get_ai_recommendations():
    if request.method == "OPTIONS":
        return "", 200
    try:
        # Fallback to curated recommendations (AI removed)
        return get_fallback_recommendations()
        
    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        return jsonify({"error": "Failed to get recommendations"}), 500

@app.route("/download", methods=["POST", "OPTIONS"])
def download_song():
    if request.method == "OPTIONS":
        return "", 200
    try:
        data = request.get_json()
        youtube_id = data.get('youtube_id', '').strip()
        
        if not youtube_id:
            return jsonify({"error": "YouTube ID is required"}), 400
        
        logger.info(f"Downloading MP3 for YouTube ID: {youtube_id}")
        
        url = f"https://www.youtube.com/watch?v={youtube_id}"
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': 'downloads/%(title)s.%(ext)s',
            'noplaylist': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        # Find the downloaded file (yt-dlp may sanitize title)
        downloaded_files = [f for f in os.listdir('downloads') if f.endswith('.mp3') and time.time() - os.path.getmtime(os.path.join('downloads', f)) < 60]  # Recent files
        if downloaded_files:
            filename = downloaded_files[0]  # Assume latest
            file_path = os.path.join('downloads', filename)
            logger.info(f"Downloaded: {file_path}")
            return jsonify({
                "success": True,
                "file": filename,
                "path": file_path
            })
        else:
            return jsonify({"error": "Download completed but file not found"}), 500
            
    except Exception as e:
        logger.error(f"Download error: {e}")
        return jsonify({"error": "Failed to download song", "details": str(e)}), 500

@app.route('/downloads/<filename>', methods=['GET'])
def serve_download(filename):
    try:
        return send_from_directory('downloads', filename)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route("/", methods=["GET"])
def home():
    return "Music API is running!"

# ========================
# PLAYLIST SYSTEM - hyde.json
# ========================

PLAYLIST_FILE = "hyde.json"

def load_playlists():
    """Load playlists from hyde.json"""
    if not os.path.exists(PLAYLIST_FILE):
        return {}
    try:
        with open(PLAYLIST_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                return {}
            return json.loads(content)
    except Exception as e:
        logger.error(f"Error loading playlists: {e}")
        return {}

def save_playlists(playlists):
    """Save playlists to hyde.json"""
    try:
        with open(PLAYLIST_FILE, 'w', encoding='utf-8') as f:
            json.dump(playlists, f, indent=2, ensure_ascii=False)
        logger.info("Playlists saved to hyde.json")
    except Exception as e:
        logger.error(f"Error saving playlists: {e}")

# Initialize playlists on startup
PLAYLISTS = load_playlists()

# ========================
# PLAYLIST ENDPOINTS
# ========================

@app.route("/playlist/create", methods=["POST", "OPTIONS"])
def create_playlist():
    if request.method == "OPTIONS":
        return "", 200
    try:
        data = request.get_json()
        name = data.get("name", "").strip()
        if not name:
            return jsonify({"error": "Playlist name is required"}), 400
        
        global PLAYLISTS
        if name in PLAYLISTS:
            return jsonify({"error": "Playlist already exists"}), 400
        
        PLAYLISTS[name] = {
            "name": name,
            "tracks": [],
            "created_at": time.time(),
            "cover": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"  # default rickroll :)
        }
        save_playlists(PLAYLISTS)
        
        return jsonify({"success": True, "playlist": PLAYLISTS[name]})
    
    except Exception as e:
        logger.error(f"Create playlist error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/playlists", methods=["GET"])
def get_playlists():
    try:
        global PLAYLISTS
        playlists_list = [
            {
                "name": name,
                "track_count": len(data["tracks"]),
                "created_at": data.get("created_at"),
                "cover": data.get("cover", f"https://img.youtube.com/vi/{data['tracks'][0]['youtube_id']}/hqdefault.jpg" if data["tracks"] else None)
            }
            for name, data in PLAYLISTS.items()
        ]
        return jsonify({"playlists": playlists_list})
    
    except Exception as e:
        logger.error(f"Get playlists error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/playlist/<playlist_name>", methods=["GET"])
def get_playlist(playlist_name):
    try:
        global PLAYLISTS
        decoded_name = urllib.parse.unquote(playlist_name)
        
        if decoded_name not in PLAYLISTS:
            return jsonify({"error": "Playlist not found"}), 404
        
        playlist = PLAYLISTS[decoded_name]
        tracks = playlist["tracks"]
        
        # Update cover if playlist has tracks
        if tracks and "cover" not in playlist:
            playlist["cover"] = f"https://img.youtube.com/vi/{tracks[0]['youtube_id']}/hqdefault.jpg"
            save_playlists(PLAYLISTS)
        
        return jsonify({
            "name": decoded_name,
            "tracks": tracks,
            "total": len(tracks),
            "cover": playlist.get("cover")
        })
    
    except Exception as e:
        logger.error(f"Get playlist error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/playlist/add", methods=["POST", "OPTIONS"])
def add_to_playlist():
    if request.method == "OPTIONS":
        return "", 200
    try:
        data = request.get_json()
        playlist_name = data.get("playlist_name")
        track = data.get("track")  # expects full track object
        
        if not playlist_name or not track:
            return jsonify({"error": "playlist_name and track are required"}), 400
        
        global PLAYLISTS
        if playlist_name not in PLAYLISTS:
            return jsonify({"error": "Playlist not found"}), 404
        
        # Avoid duplicates
        existing_ids = {t["youtube_id"] for t in PLAYLISTS[playlist_name]["tracks"]}
        if track["youtube_id"] not in existing_ids:
            PLAYLISTS[playlist_name]["tracks"].append(track)
            # Update cover if first song
            if len(PLAYLISTS[playlist_name]["tracks"]) == 1:
                PLAYLISTS[playlist_name]["cover"] = track["image"]
            save_playlists(PLAYLISTS)
        
        return jsonify({"success": True, "playlist": PLAYLISTS[playlist_name]})
    
    except Exception as e:
        logger.error(f"Add to playlist error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/playlist/remove", methods=["POST", "OPTIONS"])
def remove_from_playlist():
    if request.method == "OPTIONS":
        return "", 200
    try:
        data = request.get_json()
        playlist_name = data.get("playlist_name")
        youtube_id = data.get("youtube_id")
        
        if not playlist_name or not youtube_id:
            return jsonify({"error": "playlist_name and youtube_id are required"}), 400
        
        global PLAYLISTS
        if playlist_name not in PLAYLISTS:
            return jsonify({"error": "Playlist not found"}), 404
        
        original_count = len(PLAYLISTS[playlist_name]["tracks"])
        PLAYLISTS[playlist_name]["tracks"] = [
            t for t in PLAYLISTS[playlist_name]["tracks"] 
            if t["youtube_id"] != youtube_id
        ]
        
        if len(PLAYLISTS[playlist_name]["tracks"]) < original_count:
            # Update cover if needed
            if PLAYLISTS[playlist_name]["tracks"]:
                PLAYLISTS[playlist_name]["cover"] = PLAYLISTS[playlist_name]["tracks"][0]["image"]
            else:
                PLAYLISTS[playlist_name]["cover"] = None
            save_playlists(PLAYLISTS)
            return jsonify({"success": True, "removed": True})
        else:
            return jsonify({"success": True, "removed": False, "message": "Track not in playlist"})
    
    except Exception as e:
        logger.error(f"Remove from playlist error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/playlist/<playlist_name>", methods=["DELETE"])
def delete_playlist(playlist_name):
    try:
        global PLAYLISTS
        decoded_name = urllib.parse.unquote(playlist_name)
        
        if decoded_name not in PLAYLISTS:
            return jsonify({"error": "Playlist not found"}), 404
        
        del PLAYLISTS[decoded_name]
        save_playlists(PLAYLISTS)
        
        return jsonify({"success": True, "message": "Playlist deleted"})
    
    except Exception as e:
        logger.error(f"Delete playlist error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("Starting Flask Music API server...")
    print("Note: Ensure yt-dlp and FFmpeg are installed for MP3 downloads.")
    app.run(debug=True, port=5001, host="0.0.0.0")