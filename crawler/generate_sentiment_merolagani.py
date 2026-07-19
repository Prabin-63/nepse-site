import pandas as pd
from transformers import pipeline
from tqdm import tqdm

print("Loading FinBERT...")

finbert = pipeline(
    "text-classification",
    model="ProsusAI/finbert"
)

df = pd.read_csv("merolagani_english_news.csv")

print("Articles found:", len(df))

sentiments = []
confidences = []

for text in tqdm(df["title"].fillna("")):

    try:

        result = finbert(
            text[:512]
        )[0]

        sentiments.append(
            result["label"]
        )

        confidences.append(
            result["score"]
        )

    except Exception:

        sentiments.append("neutral")
        confidences.append(0)

df["sentiment"] = sentiments
df["confidence"] = confidences

df.to_csv(
    "merolagani_sentiment_results.csv",
    index=False
)

print("\nFinished!")
print(df.head())