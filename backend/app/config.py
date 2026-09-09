import os
from pathlib import Path
import secrets

# This recovery defaults to a private local database. No legacy hosted service is contacted.
LOCAL_DATA = Path(__file__).resolve().parents[1] / "instance"
LOCAL_DATA.mkdir(exist_ok=True)
key_file = LOCAL_DATA / ".secret-key"
if not os.environ.get("SECRET_KEY") and not key_file.exists():
    with key_file.open("x") as stream:
        stream.write(secrets.token_hex(32))
    key_file.chmod(0o600)

class Configuration:
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", f"sqlite:///{LOCAL_DATA / 'aura.sqlite3'}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get("SECRET_KEY") or key_file.read_text().strip()
