"""Vercel WSGI entry point for the Aura web demo.

The Flask application remains responsible for both the API and the Expo export,
so browser requests retain one HTTPS origin and one CSP policy owner.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

# Vercel's function filesystem is read-only. The generated export is bundled
# with this function and is the production default; local callers can still
# select a different export explicitly.
os.environ.setdefault("AURA_DEMO_STATIC_DIR", str(ROOT / "client" / "dist"))

from aura_demo import create_app


app = create_app()
