"""AdversarialShield API. The React bench calls this process for every score."""

from __future__ import annotations

import logging
import os

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))

app = FastAPI(title="AdversarialShield", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api")
