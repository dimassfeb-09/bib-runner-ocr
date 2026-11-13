import os
import glob
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def convert_all_models():
    """
    Scans the weights/ directory for all best.pt PyTorch model weights
    and converts them to ONNX format using the ultralytics library.
    """
    logger.info("Scanning for PyTorch model weights in weights/ directory...")
    
    # Locate all best.pt files
    pt_files = glob.glob(os.path.join("weights", "**", "best.pt"), recursive=True)
    if not pt_files:
        logger.warning("No PyTorch models ('best.pt') found in the weights/ directory.")
        return

    logger.info(f"Found {len(pt_files)} PyTorch models to convert.")
    
    # Import ultralytics inside the function to keep it lazy
    try:
        from ultralytics import YOLO
    except ImportError as e:
        logger.error("Failed to import ultralytics. Make sure it is installed (pip install ultralytics).")
        raise e

    for pt_path in pt_files:
        # Standard path separators for safety across platforms
        pt_path = pt_path.replace("\\", "/")
        onnx_path = pt_path.replace(".pt", ".onnx")
        
        if os.path.exists(onnx_path):
            logger.info(f"ONNX model already exists at '{onnx_path}'. Skipping conversion.")
            continue
            
        logger.info(f"Converting '{pt_path}' to ONNX format...")
        try:
            model = YOLO(pt_path)
            # Export to ONNX. It defaults to saving in the same directory.
            # We use dynamic=False because it's optimized for static shape inference on CPU.
            model.export(format="onnx")
            
            if os.path.exists(onnx_path):
                logger.info(f"Successfully converted and verified '{onnx_path}'")
            else:
                logger.error(f"Export completed but ONNX file was not found at '{onnx_path}'")
        except Exception as e:
            logger.error(f"Failed to convert '{pt_path}': {e}", exc_info=True)

if __name__ == "__main__":
    convert_all_models()
