import sqlite3
import pandas as pd
import requests
from bs4 import BeautifulSoup
import time

##########################################################

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

##########################################################

conn = sqlite3.connect("news.db")

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS news(

url TEXT PRIMARY KEY,

title TEXT,

date TEXT,

article TEXT

)
""")

conn.commit()

##########################################################

df = pd.read_csv("all_article_links.csv")

urls = df["url"].tolist()

##########################################################

session = requests.Session()
session.headers.update(HEADERS)

##########################################################

for i, url in enumerate(urls):

    # Skip if already scraped
    cursor.execute(
        "SELECT 1 FROM news WHERE url=?",
        (url,)
    )

    if cursor.fetchone():
        continue

    try:

        r = session.get(url, timeout=20)

        soup = BeautifulSoup(r.text, "html.parser")

        ##################################################

        # TITLE

        title = ""

        h1 = soup.find("h1")

        if h1:
            title = h1.get_text(" ", strip=True)

        ##################################################

        # DATE

        date = ""

        h5 = soup.find("h5")

        if h5:
            date = h5.get_text(" ", strip=True)

        ##################################################

        # ARTICLE

        article = ""

        body = soup.find(id="newsdetail-content")

        if body:

            paragraphs = body.find_all("p")

            article = "\n".join(
                p.get_text(" ", strip=True)
                for p in paragraphs
            )

        ##################################################

        cursor.execute(
            """
            INSERT OR IGNORE INTO news
            VALUES(?,?,?,?)
            """,
            (
                url,
                title,
                date,
                article
            )
        )

        conn.commit()

        print(
            f"{i+1}/{len(urls)}",
            title[:60]
        )

        time.sleep(1)

    except Exception as e:

        print("ERROR:", url)

        print(e)

##########################################################

conn.close()

print("\nFinished.")