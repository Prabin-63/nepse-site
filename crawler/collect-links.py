import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from urllib.parse import urljoin

# ==========================================================
# Configuration
# ==========================================================

BASE_URL = "https://www.sharesansar.com/category/nepse-news"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/137.0.0.0 Safari/537.36"
    )
}

session = requests.Session()
session.headers.update(HEADERS)

# ==========================================================
# Variables
# ==========================================================

visited_pages = set()
article_links = set()

current_url = BASE_URL
page = 1

# ==========================================================
# Crawl
# ==========================================================

while True:

    if current_url in visited_pages:
        print("Already visited page.")
        break

    visited_pages.add(current_url)

    print("=" * 70)
    print(f"PAGE {page}")
    print(current_url)

    # -----------------------------
    # Download page
    # -----------------------------

    success = False

    for attempt in range(5):

        try:

            response = session.get(current_url, timeout=30)
            response.raise_for_status()

            success = True
            break

        except Exception as e:

            print(f"Retry {attempt+1}/5")

            time.sleep(5)

    if not success:

        print("Could not download page.")
        break

    soup = BeautifulSoup(response.text, "html.parser")

    # -----------------------------
    # Find news container
    # -----------------------------

    container = soup.find("div", class_="newslist")

    if container is None:
        print("News container not found.")
        break

    # -----------------------------
    # Find article cards
    # -----------------------------

    articles = container.find_all("div", class_="featured-news-list")

    print("Articles on this page:", len(articles))

    # -----------------------------
    # Extract links
    # -----------------------------

    for article in articles:

        a = article.find("a", href=True)

        if a:

            full_url = urljoin(
                "https://www.sharesansar.com",
                a["href"]
            )

            article_links.add(full_url)

    print("Total unique articles:", len(article_links))

    # -----------------------------
    # Save progress
    # -----------------------------

    pd.DataFrame(
        sorted(article_links),
        columns=["url"]
    ).to_csv(
        "all_article_links.csv",
        index=False
    )

    # -----------------------------
    # Find Next Page
    # -----------------------------

    next_page = None

    for a in soup.find_all("a", href=True):

        text = a.get_text(strip=True)

        href = a["href"]

        if text == "Next »" and "cursor=" in href:

            next_page = urljoin(BASE_URL, href)
            break

    if next_page is None:

        print("\nNo more pages.")
        break

    current_url = next_page

    page += 1

    time.sleep(1.5)

# ==========================================================
# Finished
# ==========================================================

print("\nFinished!")
print("Pages Crawled :", page)
print("Articles Found:", len(article_links))