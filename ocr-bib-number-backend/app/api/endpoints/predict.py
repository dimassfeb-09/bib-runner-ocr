import logging
import cv2
import numpy as np
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.services.predictor import predictor_coordinator

logger = logging.getLogger("app.api.endpoints.predict")
router = APIRouter()

class PredictionItem(BaseModel):
    bib: str
    confidence: float
    bbox: list[int]

class PredictResponse(BaseModel):
    predictions: list[PredictionItem]

@router.post(
    "/detect-bib", 
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect BIB numbers in a runner's photo",
    description="Accepts an image upload and detects coordinates of BIB numbers, then extracts text using OCR."
)
async def detect_bib(
    image: UploadFile = File(..., description="The runner's photo (JPEG/PNG)"),
    model: str = Form(None, description="Optional name or path of the YOLO model weight configuration to use")
):
    # 1. Validate file extension/type
    if not image.content_type.startswith("image/"):
        logger.warning(f"Rejected upload with content type: {image.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File uploaded must be an image (JPEG/PNG)."
        )

    # 2. Read file content
    try:
        contents = await image.read()
    except Exception as e:
        logger.error(f"Failed to read upload file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error reading uploaded image file."
        )

    # 3. Decode image bytes to OpenCV (numpy array)
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        logger.warning("Uploaded file could not be decoded as an image by OpenCV.")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is not a valid image format or is corrupted."
        )

    # 4. Resolve model path dynamically
    try:
        model_path = settings.get_yolo_path_from_name(model)
    except Exception as e:
        logger.error(f"Error resolving model name: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid model configuration: {str(e)}"
        )

    # 5. Execute prediction pipeline
    try:
        predictions = await predictor_coordinator.predict(
            image=img, 
            model_path=model_path,
            conf_threshold=settings.YOLO_CONF_THRESHOLD
        )
        return {"predictions": predictions}
    except FileNotFoundError as e:
        logger.error(f"Model file not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested YOLO model weight is not available on the server."
        )
    except Exception as e:
        logger.error(f"Error running prediction pipeline: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the image."
        )
