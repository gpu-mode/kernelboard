"""
Dynamic Open Graph meta tag generation for social media previews.
Social crawlers (Twitter, Discord, Facebook) don't execute JavaScript,
so we need to inject the right meta tags server-side.
"""

import re

from flask import request

# Common social media crawler User-Agent patterns
SOCIAL_CRAWLERS = [
    "Twitterbot",
    "facebookexternalhit",
    "Facebot",
    "LinkedInBot",
    "Slackbot",
    "Discordbot",
    "TelegramBot",
    "WhatsApp",
    "Applebot",
    "Pinterest",
    "Embedly",
]

BASE_URL = "https://gpumode.com"
DEFAULT_IMAGE = f"{BASE_URL}/og-image.png"


def is_social_crawler() -> bool:
    """Check if the request is from a social media crawler."""
    user_agent = request.headers.get("User-Agent", "")
    return any(crawler.lower() in user_agent.lower() for crawler in SOCIAL_CRAWLERS)


def get_og_tags_for_path(path: str, get_leaderboard_name=None, get_news_item=None) -> dict:
    """
    Return Open Graph metadata based on the URL path.

    Args:
        path: The URL path (e.g., "/leaderboard/123")
        get_leaderboard_name: Optional callable(id) -> str to fetch leaderboard name
        get_news_item: Optional callable(slug) -> dict with title, markdown

    Returns:
        dict with keys: title, description, image, url
    """
    # Default values
    og = {
        "title": "GPU MODE",
        "description": "Learn GPU programming with lectures, hackathons, and working groups.",
        "image": DEFAULT_IMAGE,
        "url": BASE_URL,
    }

    # Clean path
    path = path.strip("/")

    # Working groups page
    if path == "working-groups":
        og["title"] = "Working Groups | GPU MODE"
        og["description"] = "Build cool stuff in public with other smart people."
        og["url"] = f"{BASE_URL}/working-groups"
        return og

    # Lectures page
    if path == "lectures":
        og["title"] = "Lectures & Hackathons | GPU MODE"
        og["description"] = "Learn GPU programming with lectures, hackathons, and working groups."
        og["url"] = f"{BASE_URL}/lectures"
        return og

    # Leaderboard page
    leaderboard_match = re.match(r"leaderboard/(\d+)", path)
    if leaderboard_match:
        leaderboard_id = leaderboard_match.group(1)
        problem_name = None

        if get_leaderboard_name:
            try:
                problem_name = get_leaderboard_name(int(leaderboard_id))
            except Exception:
                pass

        if problem_name:
            og["title"] = f"{problem_name} | GPU MODE"
            og["description"] = f"Ranking for {problem_name} - participate in our kernel competitions!"
        else:
            og["title"] = "Leaderboard | GPU MODE"
            og["description"] = "Participate in our kernel competitions!"

        og["url"] = f"{BASE_URL}/leaderboard/{leaderboard_id}"
        return og

    # News page (with optional slug)
    news_match = re.match(r"news(?:/(.+))?", path)
    if news_match:
        slug = news_match.group(1)

        if slug and get_news_item:
            try:
                news_item = get_news_item(slug)
                if news_item:
                    og["title"] = f"{news_item.get('title', 'News')} | GPU MODE"
                    # Get first ~150 chars of markdown content
                    markdown = news_item.get("markdown", "")
                    preview = markdown[:150].strip()
                    if len(markdown) > 150:
                        preview += "..."
                    og["description"] = preview or "Latest news from GPU MODE."
                    og["url"] = f"{BASE_URL}/news/{slug}"
                    return og
            except Exception:
                pass

        og["title"] = "News | GPU MODE"
        og["description"] = "Latest news and updates from GPU MODE."
        og["url"] = f"{BASE_URL}/news"
        return og

    # Home page
    if path in ("", "home"):
        og["url"] = f"{BASE_URL}/home"
        return og

    return og


def inject_og_tags(html: str, og: dict) -> str:
    """
    Inject or replace Open Graph meta tags in HTML.

    Args:
        html: The original HTML content
        og: dict with title, description, image, url

    Returns:
        Modified HTML with updated meta tags
    """
    # Build the meta tags block
    og_block = f'''<meta name="description" content="{og['description']}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{og['url']}" />
    <meta property="og:title" content="{og['title']}" />
    <meta property="og:description" content="{og['description']}" />
    <meta property="og:image" content="{og['image']}" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="{og['url']}" />
    <meta name="twitter:title" content="{og['title']}" />
    <meta name="twitter:description" content="{og['description']}" />
    <meta name="twitter:image" content="{og['image']}" />'''

    # Replace existing OG block (from description to twitter:image)
    pattern = r'<meta name="description".*?<meta name="twitter:image"[^>]*/>'

    if re.search(pattern, html, re.DOTALL):
        html = re.sub(pattern, og_block, html, flags=re.DOTALL)

    # Also update the <title> tag
    html = re.sub(
        r'<title>[^<]*</title>',
        f'<title>{og["title"]}</title>',
        html
    )

    return html
