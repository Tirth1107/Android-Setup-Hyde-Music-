import requests
import time
import subprocess
import os
import signal

def test_api():
    base_url = "http://127.0.0.1:5005"
    headers = {"X-HYDE-API-KEY": "hyde-api-key-2026"}
    
    # Start server
    print("Starting local server for testing...")
    env = os.environ.copy()
    env["PORT"] = "5005"
    server_process = subprocess.Popen(["python", "music_api.py"], env=env)
    time.sleep(3) # Wait for server to start
    
    try:
        # Test Root
        print("Testing root endpoint...")
        r = requests.get(f"{base_url}/")
        print(f"Root response: {r.json()}")
        assert r.status_code == 200
        
        # Test Search No Key
        print("Testing search without API key...")
        r = requests.get(f"{base_url}/search?q=test")
        print(f"No key status: {r.status_code}")
        assert r.status_code == 401
        
        # Test Search With Key
        print("Testing search with API key...")
        r = requests.get(f"{base_url}/search?q=never+gonna+give+you+up", headers=headers)
        print(f"Search status: {r.status_code}")
        songs = r.json()
        print(f"Found {len(songs)} songs")
        assert r.status_code == 200
        assert len(songs) > 0
        
        # Test Stream
        if songs:
            test_url = songs[0]["url"]
            print(f"Testing stream extraction for: {test_url}")
            r = requests.get(f"{base_url}/stream?url={test_url}", headers=headers)
            print(f"Stream status: {r.status_code}")
            stream_info = r.json()
            print(f"Stream URL: {stream_info.get('stream_url')[:50]}...")
            assert r.status_code == 200
            assert "stream_url" in stream_info
            
        print("\nAll local tests passed!")
        
    except Exception as e:
        print(f"Test failed: {str(e)}")
    finally:
        # Kill server
        print("Stopping server...")
        server_process.terminate()

if __name__ == "__main__":
    test_api()
