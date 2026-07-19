import pandas as pd

df = pd.read_csv("combined_sentiment_articles.csv")

# ====================================================
# Create weighted sentiment score
# ====================================================

def get_weighted_score(row):

    if row["sentiment"] == "positive":
        return row["confidence"]

    elif row["sentiment"] == "negative":
        return -row["confidence"]

    else:
        return 0

df["weighted_score"] = df.apply(
    get_weighted_score,
    axis=1
)

# ====================================================
# Parse dates
# ====================================================

# ShareSansar dates
sharesansar_dates = pd.to_datetime(
    df["date"].astype(str)
      .str.extract(r"^(.*?)(?:\s+on\s+)")[0],
    errors="coerce"
)

# MeroLagani dates
merolagani_dates = pd.to_datetime(
    df["date"],
    errors="coerce"
)

df["clean_date"] = sharesansar_dates.fillna(
    merolagani_dates
)

df = df.dropna(
    subset=["clean_date"]
)

df["clean_date"] = df["clean_date"].dt.date

print("Valid dates:", len(df))

# ====================================================
# Daily aggregation
# ====================================================

daily = df.groupby("clean_date").agg(

    total_articles=("title", "count"),

    positive=("sentiment",
              lambda x: (x == "positive").sum()),

    neutral=("sentiment",
             lambda x: (x == "neutral").sum()),

    negative=("sentiment",
             lambda x: (x == "negative").sum()),

    average_confidence=("confidence", "mean"),

    weighted_sentiment=("weighted_score", "mean")

).reset_index()

# ====================================================
# Ratios
# ====================================================

daily["positive_ratio"] = (
    daily["positive"] /
    daily["total_articles"]
)

daily["neutral_ratio"] = (
    daily["neutral"] /
    daily["total_articles"]
)

daily["negative_ratio"] = (
    daily["negative"] /
    daily["total_articles"]
)

# ====================================================
# Moving averages
# ====================================================

daily["weighted_ma3"] = (
    daily["weighted_sentiment"]
    .rolling(3)
    .mean()
)

daily["weighted_ma7"] = (
    daily["weighted_sentiment"]
    .rolling(7)
    .mean()
)

daily = daily.fillna(0)

print(daily.head())

print("\nDays:", len(daily))

daily.to_csv(
    "daily_sentiment_weighted.csv",
    index=False
)

print("\nSaved!")