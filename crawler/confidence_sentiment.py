import pandas as pd

df = pd.read_csv("sentiment_results.csv")

def get_weighted_score(row):

    if row["sentiment"] == "positive":
        return row["confidence"]

    elif row["sentiment"] == "negative":
        return -row["confidence"]

    else:
        return 0.0

df["weighted_score"] = df.apply(
    get_weighted_score,
    axis=1
)

print(
    df[
        ["sentiment",
         "confidence",
         "weighted_score"]
    ].head(20)
)

df.to_csv(
    "sentiment_weighted.csv",
    index=False
)