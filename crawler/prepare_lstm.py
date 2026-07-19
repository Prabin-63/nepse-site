import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import joblib

LOOKBACK = 30

# ==========================
# Load data
# ==========================

df = pd.read_csv("lstm_features.csv")

df["clean_date"] = pd.to_datetime(df["clean_date"])

df = df.sort_values("clean_date")

# ==========================
# Target = tomorrow sentiment
# ==========================

df["target"] = df["sentiment_index"].shift(-1)

# remove last row
df = df[:-1]

# ==========================
# Features
# ==========================

features = [
    "total_articles",
    "positive",
    "neutral",
    "negative",
    "average_score",
    "average_confidence",
    "positive_ratio",
    "neutral_ratio",
    "negative_ratio",
    "sentiment_index",
    "sentiment_ma3",
    "sentiment_ma7",
    "momentum",
    "lag1",
    "lag7"
]

X = df[features].values
y = df["target"].values

# ==========================
# Normalize
# ==========================

scaler = MinMaxScaler()

X = scaler.fit_transform(X)

joblib.dump(scaler, "scaler.save")

# ==========================
# Create sequences
# ==========================

X_seq = []
y_seq = []

for i in range(len(X) - LOOKBACK):

    X_seq.append(X[i:i+LOOKBACK])

    y_seq.append(y[i+LOOKBACK])

X_seq = np.array(X_seq)
y_seq = np.array(y_seq)

print("X shape:", X_seq.shape)
print("y shape:", y_seq.shape)

np.save("X.npy", X_seq)
np.save("y.npy", y_seq)

print("Done.")