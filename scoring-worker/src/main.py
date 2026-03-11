import os

import uvicorn
from fastapi import FastAPI

from src.routes import health, score

app = FastAPI(
    title="Carrier Risk Scoring Service",
    version="3.0.0",
    docs_url="/docs",
)

app.include_router(health.router)
app.include_router(score.router, prefix="/score")


if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8001")), reload=False)
