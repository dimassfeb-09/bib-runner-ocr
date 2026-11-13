import os
import time
import logging
import numpy as np
import cv2
import onnxruntime as ort

logger = logging.getLogger("app.services.yolo")

class YoloDetector:
    def __init__(self):
        # Cache for loaded ONNX models (model_path -> ort.InferenceSession)
        self._sessions: dict[str, ort.InferenceSession] = {}

    def _get_session(self, model_path: str) -> ort.InferenceSession:
        """
        Loads the ONNX model session lazily and caches it in memory.
        """
        if model_path not in self._sessions:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model weight file not found at: '{model_path}'")
            
            logger.info(f"Loading ONNX model session for '{model_path}' on CPU...")
            start_time = time.time()
            
            # Use CPU Execution Provider and configure options for fast CPU inference
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 2  # Match the 2 CPU specification
            opts.inter_op_num_threads = 1
            opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            
            session = ort.InferenceSession(
                model_path, 
                sess_options=opts, 
                providers=["CPUExecutionProvider"]
            )
            self._sessions[model_path] = session
            logger.info(f"Loaded ONNX model in {time.time() - start_time:.4f} seconds.")
            
        return self._sessions[model_path]

    @staticmethod
    def letterbox(im: np.ndarray, new_shape: tuple[int, int] = (640, 640), color: tuple[int, int, int] = (114, 114, 114)) -> tuple[np.ndarray, float, tuple[float, float]]:
        """
        Resizes and pads image to new_shape while keeping the original aspect ratio.
        Returns:
            padded image, scale ratio, (padding width, padding height)
        """
        shape = im.shape[:2]  # [height, width]
        
        # Scale ratio (new / old)
        r = min(new_shape[0] / shape[0], new_shape[1] / shape[1])
        
        # Compute padding
        new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
        dw = (new_shape[1] - new_unpad[0]) / 2  # width padding
        dh = (new_shape[0] - new_unpad[1]) / 2  # height padding
        
        if shape[::-1] != new_unpad:  # resize
            im = cv2.resize(im, new_unpad, interpolation=cv2.INTER_LINEAR)
            
        top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
        left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
        
        im = cv2.copyMakeBorder(im, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
        return im, r, (dw, dh)

    @staticmethod
    def nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float = 0.45) -> list[int]:
        """
        Performs Non-Maximum Suppression (NMS) on bounding boxes.
        Boxes format: [x1, y1, x2, y2]
        """
        if len(boxes) == 0:
            return []

        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = boxes[:, 2]
        y2 = boxes[:, 3]
        areas = (x2 - x1) * (y2 - y1)
        
        order = scores.argsort()[::-1]
        keep = []

        while order.size > 0:
            i = order[0]
            keep.append(i)
            
            # Intersection coordinates
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])

            # Intersection area
            w = np.maximum(0.0, xx2 - xx1)
            h = np.maximum(0.0, yy2 - yy1)
            inter = w * h
            
            # IoU
            union = areas[i] + areas[order[1:]] - inter
            iou = inter / np.maximum(union, 1e-6)

            # Keep boxes with IoU less than threshold
            inds = np.where(iou <= iou_threshold)[0]
            order = order[inds + 1]

        return keep

    def detect(self, image: np.ndarray, model_path: str, conf_threshold: float = 0.25, iou_threshold: float = 0.45) -> list[dict]:
        """
        Runs YOLO object detection on the input image.
        Args:
            image: numpy array (BGR OpenCV format)
            model_path: path to the ONNX weight file
            conf_threshold: confidence filter threshold
            iou_threshold: NMS overlap threshold
        Returns:
            list of dicts: [{"box": [x1, y1, x2, y2], "confidence": float}]
        """
        # Load / Retrieve session
        session = self._get_session(model_path)
        
        # Preprocessing: letterbox resizing
        padded_img, ratio, (dw, dh) = self.letterbox(image)
        
        # BGR to RGB, normalize, HWC to CHW
        input_data = padded_img[:, :, ::-1].transpose(2, 0, 1)  # BGR to RGB, CHW
        input_data = input_data.astype(np.float32) / 255.0      # Normalize to [0, 1]
        input_data = np.expand_dims(input_data, axis=0)         # Add batch dimension [1, 3, 640, 640]
        
        # Run inference
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        outputs = session.run([output_name], {input_name: input_data})[0]
        
        # Post-processing
        if outputs.ndim != 3:
            logger.error(f"Unexpected output dimensions: {outputs.shape}")
            return []
            
        # Check if it's an end-to-end model output (e.g., YOLO26s/YOLOv10 with shape [1, 300, 6])
        if outputs.shape[2] == 6:
            predictions = outputs[0]  # Shape: [300, 6]
            scores = predictions[:, 4]
            
            # Filter detections by confidence threshold
            keep_indices = np.where(scores >= conf_threshold)[0]
            if len(keep_indices) == 0:
                return []
                
            boxes_640 = predictions[keep_indices, 0:4]
            scores = scores[keep_indices]
            # No NMS is needed as it is built-in for end-to-end models
        else:
            # Standard YOLOv8/v11 output (e.g., shape [1, 5, 8400])
            # Reshape or transpose if the model outputs [1, 8400, 5] instead of [1, 5, 8400]
            if outputs.shape[1] > outputs.shape[2]:  # e.g., [1, 8400, 5]
                predictions = outputs[0]             # Shape: [8400, 5]
            else:                                    # e.g., [1, 5, 8400]
                predictions = outputs[0].T           # Shape: [8400, 5]
                
            # Extract fields
            x_center = predictions[:, 0]
            y_center = predictions[:, 1]
            w = predictions[:, 2]
            h = predictions[:, 3]
            scores = predictions[:, 4]  # Confidence for the single BIB class
            
            # Filter detections by confidence threshold
            keep_indices = np.where(scores >= conf_threshold)[0]
            if len(keep_indices) == 0:
                return []
                
            x_center = x_center[keep_indices]
            y_center = y_center[keep_indices]
            w = w[keep_indices]
            h = h[keep_indices]
            scores = scores[keep_indices]
            
            # Convert coordinates to x1, y1, x2, y2 format on padded 640x640 space
            x1 = x_center - w / 2
            y1 = y_center - h / 2
            x2 = x_center + w / 2
            y2 = y_center + h / 2
            
            boxes_640 = np.stack([x1, y1, x2, y2], axis=1)
            
            # Perform NMS
            nms_indices = self.nms(boxes_640, scores, iou_threshold)
            if not nms_indices:
                return []
                
            boxes_640 = boxes_640[nms_indices]
            scores = scores[nms_indices]
        
        # Scale coordinates back to original image coordinates (undo letterbox)
        orig_h, orig_w = image.shape[:2]
        detections = []
        
        for box, score in zip(boxes_640, scores):
            bx1, by1, bx2, by2 = box
            
            # Subtract padding and divide by ratio
            rx1 = max(0, int(round((bx1 - dw) / ratio)))
            ry1 = max(0, int(round((by1 - dh) / ratio)))
            rx2 = min(orig_w, int(round((bx2 - dw) / ratio)))
            ry2 = min(orig_h, int(round((by2 - dh) / ratio)))
            
            # Avoid invalid boxes
            if rx2 <= rx1 or ry2 <= ry1:
                continue
                
            detections.append({
                "box": [rx1, ry1, rx2, ry2],
                "confidence": float(score)
            })
            
        logger.info(f"Detected {len(detections)} BIB bounding boxes in the image.")
        return detections

yolo_detector = YoloDetector()
