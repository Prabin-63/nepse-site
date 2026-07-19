import pandas as pd

# =========================
# Load datasets
# =========================

nepse = pd.read_csv("nepse_features.csv")
sent = pd.read_csv("daily_sentiment_weighted.csv")

# =========================
# Convert dates
# =========================

nepse["DATE"] = pd.to_datetime(nepse["DATE"])

sent["clean_date"] = pd.to_datetime(
    sent["clean_date"]
)

# =========================
# Rename for merge
# =========================

sent = sent.rename(
    columns={
        "clean_date": "DATE"
    }
)

# =========================
# Merge
# =========================



merged = pd.merge(
    nepse,
    sent,
    on="DATE",
    how="left"      # <-- changed from inner
)

# Fill missing sentiment values
merged = merged.fillna(0)

print("Rows:", len(merged))
print()
print(merged.head())

merged.to_csv(
    "merged_nepse_sentiment.csv",
    index=False
)

print("\nSaved!")