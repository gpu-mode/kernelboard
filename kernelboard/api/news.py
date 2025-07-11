from http import HTTPStatus
import os
import yaml
from flask import Blueprint, jsonify, current_app
from kernelboard.lib.status_code import HttpError, http_error, http_success
from datetime import datetime

news_bp = Blueprint("news_api", __name__, url_prefix="/news")


@news_bp.route("", methods=["GET"])
def list_news_items():

    try:
        news_dir = os.path.join(current_app.root_path, "static/news")
        news_contents = []
        for filename in os.listdir(news_dir):
            if filename.endswith(".md"):
                target_file = os.path.join(news_dir, filename)
                print(f"detecting news md file: {target_file}")
                with open(target_file, "r", encoding="utf-8") as f:
                    raw = f.read()
                    try:
                        news_content = _to_api_news(raw)
                        news_contents.append(news_content)
                    except HttpError as e:
                        print(
                            f"[warning] failed to load news content:{target_file}, due to:{e.message}"
                        )
                        # skip the error news content
                        continue
        if not news_contents:
            return http_error(
                code=10000 + HTTPStatus.NOT_FOUND,
                status_code=HTTPStatus.NOT_FOUND,
                message="cannot find any news content from server",
            )


        sorted_news_contents = sorted(
            news_contents,
            key=lambda item: safe_parse_date(item.get("date")),
            reverse=True
        )

        return http_success(data=sorted_news_contents)
    except Exception as e:
        return http_error(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            message=f"Internal server error: {str(e)}",
        )


def _to_api_news(raw: str):
    if raw.startswith("---"):
        parts = raw.split("---", 2)
        try:
            frontmatter = yaml.safe_load(parts[1])
        except yaml.YAMLError as e:
            raise HttpError(
                f"Invalid YAML frontmatter: {str(e)}",
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        content = parts[2].strip()
    else:
        raise HttpError(
            "Missing metadata for news", status_code=HTTPStatus.INTERNAL_SERVER_ERROR
        )

    date_val = frontmatter.get("date", "")
    if isinstance(date_val, datetime):
        date_str = date_val.date().isoformat()  # e.g. "2025-07-10"
    else:
        date_str = str(date_val)

    return {
        "id": frontmatter.get("id", ""),
        "title": frontmatter.get("title", ""),
        "date": date_str,
        "category": frontmatter.get("category", ""),
        "markdown": content,
    }

def safe_parse_date(date_str):
    try:
        return datetime.fromisoformat(str(date_str))
    except Exception:
        return datetime.min
