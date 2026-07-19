import pandas as pd

df = pd.read_csv("daily_sentiment_weighted.csv")

print("\nWeighted Sentiment Statistics")
print(df["weighted_sentiment"].describe())

print("\nMost Positive Days")
print(
    df.sort_values(
        "weighted_sentiment",
        ascending=False
    )[[
        "clean_date",
        "weighted_sentiment",
        "total_articles"
    ]].head(10)
)

print("\nMost Negative Days")
print(
    df.sort_values(
        "weighted_sentiment"
    )[[
        "clean_date",
        "weighted_sentiment",
        "total_articles"
    ]].head(10)
)