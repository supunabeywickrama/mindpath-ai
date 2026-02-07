import re
from dataclasses import dataclass

@dataclass
class SafetyResult:
    is_crisis: bool
    reason: str | None = None


_CRISIS_PATTERNS = [
    r"\b(suicide|kill myself|end my life|take my life)\b",
    r"\b(self harm|self-harm|cut myself|cutting)\b",
    r"\b(i want to die|wish i were dead|can't go on|no reason to live)\b",
    r"\b(overdose|hang myself|jump off)\b",
]

def detect_crisis(text: str) -> SafetyResult:
    t = (text or "").lower()
    for p in _CRISIS_PATTERNS:
        if re.search(p, t):
            return SafetyResult(is_crisis=True, reason="crisis_keywords")
    return SafetyResult(is_crisis=False)


def crisis_response(country_hint: str | None = None) -> str:
    # Keep this generic + safe. We'll add Sri Lanka-specific numbers later if you want.
    return (
        "I’m really sorry you’re feeling this way. You don’t have to handle it alone.\n\n"
        "If you’re in immediate danger or feel you might act on these thoughts, please call your local emergency number now "
        "or go to the nearest emergency department.\n\n"
        "If you can, reach out to someone you trust right now (a friend, family member, or counselor) and tell them you need support.\n\n"
        "If you want, tell me: are you safe right now? (yes/no)"
    )
