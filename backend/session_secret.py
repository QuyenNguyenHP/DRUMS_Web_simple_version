"""Keep signed sessions valid across worker and service restarts."""
import os
import secrets
from pathlib import Path


def load_session_secret():
    configured = os.environ.get("DRUMS_SECRET_KEY")
    if configured:
        return configured
    path = Path(__file__).resolve().parent / ".session-secret"
    # Append mode plus an advisory lock also handles simultaneous worker startup.
    with path.open("a+", encoding="ascii") as stream:
        os.chmod(path, 0o600)
        if os.name == "posix":
            import fcntl
            fcntl.flock(stream, fcntl.LOCK_EX)
        stream.seek(0)
        secret = stream.read().strip()
        if not secret:
            secret = secrets.token_hex(32)
            stream.write(secret)
            stream.flush()
            os.fsync(stream.fileno())
        return secret
