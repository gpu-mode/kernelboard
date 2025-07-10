from http import HTTPStatus
import os
from requests.models import HTTPBasicAuth
import yaml
from flask import Blueprint, jsonify, current_app
from kernelboard.lib.status_code import HttpError, http_error, http_success

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
        return http_success(data=news_contents)
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

    return {
        "id": frontmatter.get("id", ""),
        "title": frontmatter.get("title", ""),
        "date": frontmatter.get("date", ""),
        "category": frontmatter.get("category", ""),
        "markdown": content,
    }
