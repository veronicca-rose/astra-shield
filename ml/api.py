from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .anomaly_detector import analyze_component


app = FastAPI(
    title="ASTRA-SHIELD AI Engine",
    description="AI-driven anomaly detection and burn-in reliability analysis",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "system": "ASTRA-SHIELD",
        "engine": "AI Reliability Engine",
        "status": "online",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "engine": "ASTRA-RX 1.0",
    }


@app.get("/analyze/{component_id}")
def analyze(component_id: str):
    try:
        result = analyze_component(component_id)

        # Convert NumPy values into normal Python values
        # so FastAPI can safely return JSON.
        clean_result = {}

        for key, value in result.items():
            if hasattr(value, "item"):
                clean_result[key] = value.item()
            else:
                clean_result[key] = value

        return {
            "success": True,
            "analysis": clean_result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(error)}",
        )


@app.get("/components")
def components():
    component_ids = [
        "AST-24-00871",
        "AST-24-00318",
        "AST-25-00142",
        "AST-25-00491",
        "AST-24-00912",
    ]

    return {
        "count": len(component_ids),
        "components": component_ids,
    }