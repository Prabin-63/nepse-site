import sqlite3
import pandas as pd
import re
from tqdm import tqdm
from transformers import pipeline

# ==========================
# Load FinBERT
# ==========================

print("Loading FinBERT...")

classifier = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert"
)

# ==========================
# Read database
# ==========================

conn = sqlite3.connect("news.db")

df = pd.read_sql_query("SELECT * FROM news", conn)

conn.close()

print(f"Articles found: {len(df)}")

# ==========================
# Process articles
# ==========================

results = []

for _, row in tqdm(df.iterrows(), total=len(df)):

    title = str(row["title"]) if pd.notna(row["title"]) else ""
    article = str(row["article"]) if pd.notna(row["article"]) else ""

    text = title + ". " + article

    text = re.sub(r"\s+", " ", text).strip()

    # Skip empty text
    if len(text) == 0:
        continue

    # FinBERT token limit
    text = text[:1500]

    try:

        prediction = classifier(text)[0]

        results.append({

            "url": row["url"],
            "date": row["date"],
            "title": title,
            "sentiment": prediction["label"],
            "confidence": prediction["score"]

        })

    except Exception as e:

        print("\nError processing:")
        print(row["url"])
        print(e)

# ==========================
# Save CSV
# ==========================

sentiment_df = pd.DataFrame(results)

sentiment_df.to_csv(
    "sentiment_results.csv",
    index=False,
    encoding="utf-8-sig"
)

print("\n===================================")
print("Finished!")
print("Articles processed:", len(sentiment_df))
print("===================================")

print(sentiment_df.head())