import os
import logging

# Configure basic logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("app.core.config")

class Settings:
    # App Settings
    PROJECT_NAME: str = "Foto in Aja API"
    VERSION: str = "1.0.0"
    PORT: int = int(os.getenv("PORT", 8000))
    
    # YOLO Model Settings
    YOLO_CONF_THRESHOLD: float = float(os.getenv("YOLO_CONF_THRESHOLD", 0.25))
    # Default model path if none requested and env is missing
    DEFAULT_YOLO_MODEL_PATH: str = "weights/split9010_yolo26s/best.pt"
    
    # List of allowed/available models that can be chosen dynamically
    AVAILABLE_MODELS: list[str] = [
        "split7030_yolo11s",
        "split7030_yolo26s",
        "split8020_yolo11s",
        "split8020_yolo26s",
        "split9010_yolo11s",
        "split9010_yolo26s"
    ]

    def get_yolo_path_from_name(self, model_name: str | None) -> str:
        """
        Resolves the model name to the actual ONNX model file path.
        If no name is provided, uses the YOLO_MODEL_PATH env variable or DEFAULT_YOLO_MODEL_PATH.
        """
        env_model_path = os.getenv("YOLO_MODEL_PATH", self.DEFAULT_YOLO_MODEL_PATH)
        
        # If user specified a dynamic model, validate it
        if model_name:
            # Clean up input name in case it has directory slashes or .pt extension
            cleaned_name = model_name.strip().replace("\\", "/").split("/")[-2] if "/" in model_name else model_name.strip()
            cleaned_name = cleaned_name.replace(".pt", "").replace(".onnx", "")
            
            if cleaned_name in self.AVAILABLE_MODELS:
                resolved_pt = f"weights/{cleaned_name}/best.pt"
                resolved_onnx = f"weights/{cleaned_name}/best.onnx"
                logger.info(f"Resolved requested model '{model_name}' to '{resolved_onnx}'")
                return resolved_onnx
            else:
                logger.warning(f"Requested model '{model_name}' not found in available models. Falling back to default.")

        # Default fallback (from environment or code default)
        pt_path = env_model_path.replace("\\", "/")
        onnx_path = pt_path.replace(".pt", ".onnx")
        logger.info(f"Using default model path: '{onnx_path}'")
        return onnx_path

settings = Settings()
