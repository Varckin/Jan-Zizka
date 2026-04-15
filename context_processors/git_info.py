import json
from pathlib import Path
from django.conf import settings
from datetime import datetime


def load_git_info(request) -> dict:
    git_file = Path(settings.BASE_DIR) / "git_info.json"

    if not git_file.exists():
        return {
            "git_commit": None,
            "git_date": None,
        }

    try:
        with git_file.open("r", encoding="utf-8") as f:
            data = json.load(f)

        return {
            "git_commit": data.get("commit"),
            "git_date": datetime.strptime(data.get("date"), "%Y-%m-%d %H:%M:%S %z"),
        }

    except Exception:
        return {
            "git_commit": None,
            "git_date": None,
        }
