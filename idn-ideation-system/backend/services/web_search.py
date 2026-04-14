"""
Web search service using the Brave Search API.
Activated when BRAVE_SEARCH_API_KEY is set in the environment.
"""
import httpx

BRAVE_API_BASE = "https://api.search.brave.com/res/v1/web/search"


async def brave_search(query: str, api_key: str, count: int = 5) -> list[dict]:
    """
    Search the web using the Brave Search API.
    Returns a list of {title, url, snippet} dicts.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            BRAVE_API_BASE,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": api_key,
            },
            params={"q": query, "count": count, "text_decorations": False},
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("web", {}).get("results", [])[:count]:
        results.append({
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "snippet": item.get("description", ""),
        })
    return results
