
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "/v2/")  # e.g. "/", "/v2/", or "https://app.example.com"

def _is_safe_path(p: str) -> bool:
    """Allow only same-origin paths (no scheme/netloc)."""
    if not p:
        return True
    parsed = urlparse(p)
    return parsed.scheme == "" and parsed.netloc == "" and p.startswith("/")

def _frontend_redirect(path: str | None = None):
    """
    Redirect to the SPA. If FRONTEND_ORIGIN is an absolute URL (other domain),
    build an absolute redirect. Otherwise use a relative path.
    """
    target = path if (path and _is_safe_path(path)) else "/"
    # If FRONTEND_ORIGIN is absolute (starts with http), return absolute URL
    if FRONTEND_ORIGIN.startswith("http://") or FRONTEND_ORIGIN.startswith("https://"):
        # Ensure single slash join
        base = FRONTEND_ORIGIN.rstrip("/")
        t = target if target.startswith("/") else f"/{target}"
        return redirect(f"{base}{t}")
    # Otherwise treat as root path prefix on same origin
    root = FRONTEND_ORIGIN if FRONTEND_ORIGIN.endswith("/") else FRONTEND_ORIGIN + "/"
    # If caller passed query, keep it; else default to ?login=ok here or at call site
    return redirect(root.rstrip("/") + (target if target != "/" else ""))
