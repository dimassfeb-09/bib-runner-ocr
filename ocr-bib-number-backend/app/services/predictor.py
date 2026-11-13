import asyncio
import logging
import re
import numpy as np
from app.services.yolo import yolo_detector
from app.services.ocr import ocr_service

logger = logging.getLogger("app.services.predictor")

class PredictorCoordinator:
    def __init__(self):
        # A global asyncio lock to serialize ML inference.
        # This prevents RAM spikes and CPU thrashing in 2 CPU / 4GB RAM environments
        # when multiple concurrent requests are received.
        self._lock = asyncio.Lock()

    async def predict(self, image: np.ndarray, model_path: str, conf_threshold: float = 0.25) -> list[dict]:
        """
        Coordinates YOLO detection and PaddleOCR recognition on detected crops.
        Runs CPU-bound ML code in standard thread pools using asyncio.to_thread
        to keep the FastAPI main event loop unblocked.
        """
        logger.info(f"Queuing prediction request. Current lock state: {'locked' if self._lock.locked() else 'free'}")
        
        async with self._lock:
            logger.info("Acquired inference lock. Starting prediction pipeline...")
            
            # Step 1: Run YOLO detection in thread pool
            detections = await asyncio.to_thread(
                yolo_detector.detect, 
                image, 
                model_path, 
                conf_threshold
            )
            
            total_yolo_detected = len(detections) if detections else 0
            logger.info(f"YOLO Detection: Terdeteksi {total_yolo_detected} area BIB pada foto.")
            
            if not detections:
                return []
                
            predictions = []
            
            # Step 2: Loop through detections, crop, and run OCR in thread pool
            for i, det in enumerate(detections):
                box = det["box"]
                x1, y1, x2, y2 = box
                
                # Crop region of interest (BIB area)
                cropped_img = image[y1:y2, x1:x2]
                
                # Run PaddleOCR on cropped area in thread pool
                ocr_result = await asyncio.to_thread(
                    ocr_service.recognize_text, 
                    cropped_img
                )
                
                if ocr_result:
                    raw_text, ocr_confidence = ocr_result
                    
                    # Filtering khusus angka saja via regex (hanya karakter digit 0-9 yang dipertahankan)
                    filtered_text = re.sub(r"[^0-9]", "", raw_text)
                    
                    logger.info(
                        f"BIB Crop {i+1} | Raw OCR: '{raw_text}' | "
                        f"Filtered (Angka Saja): '{filtered_text}' | "
                        f"Confidence: {ocr_confidence:.4f}"
                    )
                    
                    if filtered_text:
                        predictions.append({
                            "bib": filtered_text,
                            "confidence": ocr_confidence,
                            "bbox": box
                        })
                    else:
                        logger.warning(
                            f"BIB Crop {i+1} | Hasil filter angka kosong (Raw OCR: '{raw_text}'). Mengembalikan box kosong."
                        )
                        predictions.append({
                            "bib": "",
                            "confidence": 0.0,
                            "bbox": box
                        })
                else:
                    logger.warning(f"BIB Crop {i+1} | Gagal mengenali teks dengan PaddleOCR (OCR return None). Mengembalikan box kosong.")
                    predictions.append({
                        "bib": "",
                        "confidence": 0.0,
                        "bbox": box
                    })
            
            logger.info(
                f"=== RINGKASAN DETEKSI FOTO ===\n"
                f"Total Terdeteksi YOLO  : {total_yolo_detected}\n"
                f"Hasil Akhir (Angka Saja): {[p['bib'] for p in predictions]}"
            )
            return predictions

predictor_coordinator = PredictorCoordinator()
