import logging
import time
import numpy as np

logger = logging.getLogger("app.services.ocr")

class OcrService:
    def __init__(self):
        self._ocr = None

    def _get_ocr(self):
        """
        Lazy loads the PaddleOCR engine to conserve memory on startup.
        """
        if self._ocr is None:
            logger.info("Initializing PaddleOCR engine (recognition-only)...")
            start_time = time.time()
            try:
                from paddleocr import PaddleOCR
                # Initialize PaddleOCR with detection and recognition enabled
                # Suppress PaddleOCR internal logging clutter
                logging.getLogger("ppocr").setLevel(logging.WARNING)
                
                self._ocr = PaddleOCR(
                    use_angle_cls=True,
                    lang="en",
                    det=True,
                    rec=True,
                    show_log=False
                )
                logger.info(f"PaddleOCR initialized in {time.time() - start_time:.4f} seconds.")
            except Exception as e:
                logger.error(f"Failed to initialize PaddleOCR: {e}", exc_info=True)
                raise e
        return self._ocr

    def recognize_text(self, cropped_image: np.ndarray) -> tuple[str, float] | None:
        """
        Runs text recognition (OCR) on a single cropped BIB image.
        Args:
            cropped_image: numpy array (cropped BGR image containing the BIB)
        Returns:
            Tuple of (text, confidence) or None if recognition fails or is empty.
        """
        if cropped_image is None or cropped_image.size == 0:
            return None

        ocr_engine = self._get_ocr()
        
        try:
            start_time = time.time()
            
            # Run OCR with detection enabled for high robustness against margins/clutter
            result = ocr_engine.ocr(cropped_image, cls=True)
            duration = time.time() - start_time
            logger.debug(f"OCR inference completed in {duration:.4f} seconds.")
            
            if not result or result[0] is None:
                return None
                
            # Parse PaddleOCR result (supporting dictionary v5 output and classic list formats)
            # 1. Dictionary format (PaddleX / PaddleOCR v5)
            if isinstance(result[0], dict):
                if 'rec_texts' in result[0]:
                    texts = result[0]['rec_texts']
                    scores = result[0].get('rec_scores', [1.0] * len(texts))
                    cleaned_texts = [str(t).replace(" ", "").strip() for t in texts if str(t).strip()]
                    if cleaned_texts:
                        avg_confidence = float(np.mean(scores)) if scores else 1.0
                        return "-".join(cleaned_texts), avg_confidence
                return None
                
            # 2. Classic list-of-lists format
            candidates = []
            for line in result[0]:
                if isinstance(line, (list, tuple)) and len(line) > 1 and isinstance(line[1], (list, tuple)):
                    box = line[0]
                    text = line[1][0]
                    confidence = line[1][1]
                    
                    cleaned_text = str(text).replace(" ", "").strip()
                    if not cleaned_text:
                        continue
                        
                    # Calculate true geometric height (distance between top and bottom vertices)
                    # to prevent rotation/tilt from inflating the y-span height.
                    try:
                        import math
                        h1 = math.sqrt((box[0][0] - box[3][0])**2 + (box[0][1] - box[3][1])**2)
                        h2 = math.sqrt((box[1][0] - box[2][0])**2 + (box[1][1] - box[2][1])**2)
                        height = (h1 + h2) / 2.0
                    except Exception:
                        height = 1.0
                        
                    has_digit = any(c.isdigit() for c in cleaned_text)
                    candidates.append({
                        "text": cleaned_text,
                        "confidence": float(confidence),
                        "height": height,
                        "has_digit": has_digit
                    })
                    
            if not candidates:
                return None
                
            # Filter candidates that contain digits
            digit_candidates = [c for c in candidates if c["has_digit"]]
            
            if digit_candidates:
                # Find maximum height among digit-containing candidates
                max_height = max(c["height"] for c in digit_candidates)
                
                # Keep only candidates that are at least 80% of the max height
                # to filter out small noises/sponsor logos (like "10K" or small dates/numbers)
                filtered = [c for c in digit_candidates if c["height"] >= 0.8 * max_height]
                
                # If we have filtered candidates, join them
                texts = [c["text"] for c in filtered]
                confidences = [c["confidence"] for c in filtered]
                avg_confidence = float(np.mean(confidences)) if confidences else 1.0
                return "-".join(texts), avg_confidence
            else:
                # Fallback if no candidate contains digits: return the largest text block
                max_height = max(c["height"] for c in candidates)
                filtered = [c for c in candidates if c["height"] >= 0.8 * max_height]
                texts = [c["text"] for c in filtered]
                confidences = [c["confidence"] for c in filtered]
                avg_confidence = float(np.mean(confidences)) if confidences else 1.0
                return "-".join(texts), avg_confidence
        except Exception as e:
            logger.error(f"OCR error during text recognition: {e}", exc_info=True)
            return None

ocr_service = OcrService()
