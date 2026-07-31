"""Cognito Pre-Sign-Up trigger.

Enforces an email allowlist for federated (Google) sign-ups. Any email not on
ALLOWED_EMAILS is rejected before a user record is created, keeping the app
private even though Google federation would otherwise let any Google account in.

Fails closed: an empty or missing allowlist rejects everyone.
"""

import os


def _allowed_emails():
    raw = os.environ.get("ALLOWED_EMAILS", "")
    return {entry.strip().lower() for entry in raw.split(",") if entry.strip()}


def handler(event, _context):
    attributes = event.get("request", {}).get("userAttributes", {}) or {}
    email = (attributes.get("email") or "").strip().lower()

    allowlist = _allowed_emails()
    if not email or email not in allowlist:
        raise Exception("Your account is not authorized to access this application.")

    event["response"]["autoConfirmUser"] = True
    event["response"]["autoVerifyEmail"] = True

    return event
