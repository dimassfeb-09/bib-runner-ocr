import cv2
import numpy as np
import sys
import os

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.yolo import yolo_detector
from app.core.config import settings
from app.services.ocr import ocr_service

def debug():
    img_path = "Lao-De-Safrudin-oke.jpg"
    if not os.path.exists(img_path):
        print(f"Image {img_path} not found.")
        return
        
    img = cv2.imread(img_path)
    print("Original image shape (H, W, C):", img.shape)
    
    for model_name in settings.AVAILABLE_MODELS:
        print(f"\n--- Testing model: {model_name} ---")
        try:
            model_path = settings.get_yolo_path_from_name(model_name)
            # We need to make sure the ONNX file exists
            if not os.path.exists(model_path):
                print(f"ONNX model not found at {model_path}")
                continue
                
            dets = yolo_detector.detect(img, model_path)
            print(f"Detected {len(dets)} boxes:")
            for i, det in enumerate(dets):
                box = det["box"]
                conf = det["confidence"]
                print(f"  Box {i+1}: {box} (conf: {conf:.4f})")
                
                # Crop and test OCR
                x1, y1, x2, y2 = box
                crop = img[y1:y2, x1:x2]
                print(f"    Crop shape: {crop.shape}")
                
                # Save crop for inspection
                crop_name = f"crop_{model_name}_{i+1}.jpg"
                cv2.imwrite(crop_name, crop)
                print(f"    Saved crop to {crop_name}")
                
                # Run OCR
                ocr_res = ocr_service.recognize_text(crop)
                if ocr_res:
                    print(f"    OCR Result: {ocr_res}")
                else:
                    print(f"    OCR Result: Failed (None)")
        except Exception as e:
            print(f"Error testing model {model_name}: {e}")

if __name__ == "__main__":
    debug()
