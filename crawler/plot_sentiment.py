import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv(
    "daily_sentiment_weighted.csv"
)

df["clean_date"] = pd.to_datetime(
    df["clean_date"]
)

plt.figure(figsize=(12,6))

plt.plot(
    df["clean_date"],
    df["weighted_sentiment"]
)

plt.title(
    "Daily Weighted Sentiment"
)

plt.xlabel("Date")
plt.ylabel("Sentiment")

plt.tight_layout()

plt.show()