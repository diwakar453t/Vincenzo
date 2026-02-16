"""Middleware for PreSkool ERP backend."""
import time
import logging
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.exceptions import PreSkoolException

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests and responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Log request
        logger.info(f"Request: {request.method} {request.url.path}")
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log response
        logger.info(
            f"Response: {request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Time: {process_time:.3f}s"
        )
        
        # Add processing time header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response


class TenantMiddleware(BaseHTTPMiddleware):
    """Middleware for extracting and validating tenant information."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract tenant from subdomain or header
        tenant_id = request.headers.get("X-Tenant-ID")
        
        if not tenant_id:
            # Try to extract from subdomain
            host = request.headers.get("host", "")
            if "." in host:
                tenant_id = host.split(".")[0]
        
        # Store tenant in request state
        request.state.tenant_id = tenant_id
        
        # Process request
        response = await call_next(request)
        
        return response


class ExceptionHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware for handling custom exceptions."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except PreSkoolException as exc:
            logger.error(f"PreSkool Exception: {exc.message}", exc_info=True)
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": exc.message,
                    "details": exc.details,
                    "status_code": exc.status_code
                }
            )
        except Exception as exc:
            logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "details": str(exc) if logger.level == logging.DEBUG else None,
                    "status_code": 500
                }
            )
