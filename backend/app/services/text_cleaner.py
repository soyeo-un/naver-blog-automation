import re
import unicodedata

INVISIBLE_PATTERN = re.compile(
    "["
    "\u00ad"
    "\u034f"
    "\u061c"
    "\u115f\u1160"
    "\u17b4\u17b5"
    "\u180e"
    "\u200b-\u200f"
    "\u202a-\u202e"
    "\u2060-\u2064"
    "\u2066-\u206f"
    "\u3164"
    "\ufe00-\ufe0f"
    "\ufeff"
    "\uffa0"
    "\U000e0001"
    "\U000e0020-\U000e007f"
    "]"
)


class TextCleaner:
    @staticmethod
    def clean(text: str) -> str:
        return INVISIBLE_PATTERN.sub("", text)

    @staticmethod
    def scan(text: str) -> dict:
        positions = []
        for i, char in enumerate(text):
            if INVISIBLE_PATTERN.match(char):
                positions.append({
                    "index": i,
                    "char_code": f"U+{ord(char):04X}",
                    "char_name": unicodedata.name(char, "UNKNOWN"),
                })
        return {
            "is_clean": len(positions) == 0,
            "total_hidden": len(positions),
            "positions": positions,
            "text_length": len(text),
        }

    @staticmethod
    def clean_html(html: str) -> str:
        parts = re.split(r"(<[^>]+>)", html)
        cleaned = []
        for part in parts:
            if part.startswith("<"):
                cleaned.append(part)
            else:
                cleaned.append(INVISIBLE_PATTERN.sub("", part))
        return "".join(cleaned)
