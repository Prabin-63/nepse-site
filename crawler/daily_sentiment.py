import pandas as pd
import re

# Read article sentiments
df = pd.read_csv("sentiment_results.csv")

# ----------------------------------------
# Extract the date
# ----------------------------------------

pattern = r'([A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4})'

df["clean_date"] = (
    df["date"]
    .str.extract(pattern)[0]
)

df["clean_date"] = pd.to_datetime(
    df["clean_date"],
    format="%a, %b %d, %Y"
)

# ----------------------------------------
# Convert sentiment to numeric
# ----------------------------------------

mapping = {
    "positive": 1,
    "neutral": 0,
    "negative": -1
}

df["score"] = df["sentiment"].map(mapping)

# ----------------------------------------
# Aggregate by day
# ----------------------------------------

daily = df.groupby("clean_date").agg(

    total_articles=("score", "count"),

    positive=("sentiment", lambda x: (x == "positive").sum()),

    neutral=("sentiment", lambda x: (x == "neutral").sum()),

    negative=("sentiment", lambda x: (x == "negative").sum()),

    average_score=("score", "mean"),

    average_confidence=("confidence", "mean")

).reset_index()

# ----------------------------------------
# Ratios
# ----------------------------------------

daily["positive_ratio"] = daily["positive"] / daily["total_articles"]

daily["neutral_ratio"] = daily["neutral"] / daily["total_articles"]

daily["negative_ratio"] = daily["negative"] / daily["total_articles"]

daily["sentiment_index"] = (
    daily["positive"] - daily["negative"]
) / daily["total_articles"]

# ----------------------------------------
# Save
# ----------------------------------------

daily.to_csv(
    "daily_sentiment.csv",
    index=False
)

print(daily.head())

print()

print("Total days:", len(daily))