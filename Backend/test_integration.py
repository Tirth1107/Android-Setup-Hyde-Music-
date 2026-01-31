import requests
import json
import time

def test_chat_api():
    """Test the chat API endpoint"""
    print("Testing Chat API...")
    
    url = "http://localhost:5001/chat"
    data = {
        "session_id": "test_session",
        "question": "Hello, how are you?"
    }
    
    try:
        response = requests.post(url, json=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Chat API working: {result['bot'][:100]}...")
        else:
            print(f"❌ Chat API failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Chat API error: {str(e)}")

def test_music_search():
    """Test the music search API endpoint"""
    print("\nTesting Music Search API...")
    
    url = "http://localhost:5001/search_music"
    data = {
        "query": "Shape of You Ed Sheeran"
    }
    
    try:
        response = requests.post(url, json=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            tracks = result.get('tracks', [])
            print(f"✅ Music Search working: Found {len(tracks)} tracks")
            if tracks:
                track = tracks[0]
                print(f"   First track: {track['name']} by {', '.join(track['artists'])}")
                print(f"   YouTube ID: {track.get('youtube_id', 'None')}")
        else:
            print(f"❌ Music Search failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Music Search error: {str(e)}")

def test_health_check():
    """Test the health check endpoint"""
    print("\nTesting Health Check...")
    
    url = "http://localhost:5001/health"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Health Check: {result['status']}")
            print(f"   Model: {result.get('model', 'Unknown')}")
            print(f"   Spotify: {result.get('spotify', 'Unknown')}")
        else:
            print(f"❌ Health Check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health Check error: {str(e)}")

if __name__ == "__main__":
    print("🧪 Starting API Integration Tests")
    print("=" * 50)
    
    # Wait a moment for server to be ready
    print("Waiting for server to be ready...")
    time.sleep(2)
    
    test_health_check()
    test_chat_api()
    test_music_search()
    
    print("\n" + "=" * 50)
    print("✅ Integration tests completed!")
