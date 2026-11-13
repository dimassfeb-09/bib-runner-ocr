import sys
import os

try:
    import requests
except ImportError:
    print("Error: 'requests' library is not installed.")
    print("Please install it on the host by running: pip install requests")
    sys.exit(1)

def test_detect_bib(image_path: str, model_name: str = None):
    url = "http://localhost:8000/detect-bib"
    
    if not os.path.exists(image_path):
        print(f"Error: Test image file not found at: '{image_path}'")
        return

    print(f"Sending request to {url}...")
    print(f"Image: {image_path}")
    if model_name:
        print(f"Requested Model: {model_name}")
    else:
        print("Using default server model")

    # Prepare form data
    files = {
        "image": (os.path.basename(image_path), open(image_path, "rb"), "image/jpeg")
    }
    data = {}
    if model_name:
        data["model"] = model_name

    try:
        response = requests.post(url, files=files, data=data, timeout=30)
        print(f"\nResponse Code: {response.status_code}")
        
        if response.status_code == 200:
            print("Predictions:")
            import json
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_api.py <path_to_image> [model_name]")
        print("Example: python test_api.py test_runner.jpg split9010_yolo26s")
        sys.exit(1)

    img_path = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else None
    test_detect_bib(img_path, model)
