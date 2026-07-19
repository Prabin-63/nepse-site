import pandas as pd

df = pd.read_csv("daily_sentiment_weighted.csv")

# Moving averages
df["sentiment_ma3"] = (
    df["weighted_sentiment"]
    .rolling(3)
    .mean()
)

df["sentiment_ma7"] = (
    df["weighted_sentiment"]
    .rolling(7)
    .mean()
)

# Momentum
df["momentum"] = (
    df["weighted_sentiment"]
    - df["weighted_sentiment"].shift(1)
)

# Lag features
df["lag1"] = df["weighted_sentiment"].shift(1)

df["lag7"] = df["weighted_sentiment"].shift(7)

# Fill missing values
df = df.fillna(0)

print(df.head())
print("\nRows:", len(df))

df.to_csv(
    "sentiment_features.csv",
    index=False
)

print("\nSaved!")