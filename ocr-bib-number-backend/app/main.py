import logging
import asyncio
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.endpoints.predict import router as predict_router

logger = logging.getLogger("app.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler for FastAPI. Runs startup pre-warming of default
    YOLO ONNX and PaddleOCR models inside thread pools, ensuring that the
    very first prediction request is served instantly without cold starts.
    """
    logger.info("Initializing BIBRunnerOCR API service...")
    
    # Pre-warm default models in thread pool on startup
    try:
        from app.services.ocr import ocr_service
        from app.services.yolo import yolo_detector
        
        # Warmup default YOLO model
        default_model_path = settings.get_yolo_path_from_name(None)
        logger.info(f"Pre-warming default YOLO ONNX model from '{default_model_path}'...")
        await asyncio.to_thread(yolo_detector._get_session, default_model_path)
        
        # Warmup PaddleOCR engine
        logger.info("Pre-warming PaddleOCR engine...")
        await asyncio.to_thread(ocr_service._get_ocr)
        
        logger.info("Pre-warming finished. Application is fully ready.")
    except Exception as e:
        logger.warning(
            f"Pre-warming failed or skipped during startup: {e}. "
            f"Models will load lazily on the first request."
        )
        
    yield
    logger.info("Shutting down BIBRunnerOCR API...")

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    description="FastAPI service for runner BIB number detection and text recognition using YOLO ONNX and PaddleOCR."
)

# Middleware untuk mencatat (logging) setiap hit / request ke backend
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Dapatkan informasi client & request
    client_host = request.client.host if request.client else "unknown"
    method = request.method
    path = request.url.path
    query_params = request.url.query
    
    full_path = f"{path}?{query_params}" if query_params else path
    
    logger.info(f"Request Masuk: {method} {full_path} | Client IP: {client_host}")
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        formatted_process_time = f"{process_time:.2f}ms"
        
        logger.info(
            f"Response Terkirim: {method} {path} | Status Code: {response.status_code} | "
            f"Waktu Proses: {formatted_process_time}"
        )
        return response
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        formatted_process_time = f"{process_time:.2f}ms"
        logger.error(
            f"Request Gagal: {method} {path} | Error: {str(e)} | "
            f"Waktu Proses: {formatted_process_time}"
        )
        raise e

# Set up CORS Middleware to allow Next.js (port 3000) or other clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production for security if necessary
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Endpoints
app.include_router(predict_router, tags=["Predictions"])

@app.get(
    "/health", 
    status_code=status.HTTP_200_OK, 
    tags=["Diagnostics"],
    summary="Health check endpoint"
)
async def health_check():
    """
    Basic health check to verify backend status.
    """
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=False)
