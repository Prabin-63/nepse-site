import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

# =====================================
# Load data
# =====================================

X = np.load("X.npy")
y = np.load("y.npy")

print("Dataset Loaded")
print("X shape:", X.shape)
print("y shape:", y.shape)

# =====================================
# Train/Test Split
# =====================================

split = int(len(X) * 0.8)

X_train = X[:split]
X_test = X[split:]

y_train = y[:split]
y_test = y[split:]

print("\nTraining Samples:", len(X_train))
print("Testing Samples :", len(X_test))

# =====================================
# Build LSTM Model
# =====================================

model = Sequential()

model.add(
    LSTM(
        64,
        return_sequences=True,
        input_shape=(X.shape[1], X.shape[2])
    )
)

model.add(Dropout(0.2))

model.add(LSTM(32))

model.add(Dropout(0.2))

model.add(Dense(16, activation="relu"))

model.add(Dense(1))

model.compile(
    optimizer="adam",
    loss="mse",
    metrics=["mae"]
)

print("\nModel Summary")
model.summary()

# =====================================
# Early Stopping
# =====================================

early_stop = EarlyStopping(
    monitor="val_loss",
    patience=10,
    restore_best_weights=True
)

# =====================================
# Train
# =====================================

history = model.fit(
    X_train,
    y_train,
    validation_data=(X_test, y_test),
    epochs=50,
    batch_size=32,
    callbacks=[early_stop],
    verbose=1
)

# =====================================
# Predict
# =====================================

predictions = model.predict(X_test)

predictions = predictions.flatten()

# =====================================
# Evaluation
# =====================================

mae = mean_absolute_error(y_test, predictions)

rmse = np.sqrt(mean_squared_error(y_test, predictions))

r2 = r2_score(y_test, predictions)

print("\n================================")
print("Evaluation Results")
print("================================")

print(f"MAE  : {mae:.4f}")
print(f"RMSE : {rmse:.4f}")
print(f"R²   : {r2:.4f}")

# =====================================
# Save Predictions
# =====================================

results = pd.DataFrame({
    "Actual": y_test,
    "Predicted": predictions
})

results.to_csv("predictions.csv", index=False)

print("\nPredictions saved as predictions.csv")

# =====================================
# Save Model
# =====================================

model.save("sentiment_lstm.keras")

print("Model saved as sentiment_lstm.keras")

# =====================================
# Plot 1 - Loss Curve
# =====================================

plt.figure(figsize=(8,5))

plt.plot(history.history["loss"], label="Training Loss")

plt.plot(history.history["val_loss"], label="Validation Loss")

plt.title("LSTM Training Loss")

plt.xlabel("Epoch")

plt.ylabel("Loss")

plt.legend()

plt.grid(True)

plt.show()

# =====================================
# Plot 2 - Actual vs Predicted
# =====================================

plt.figure(figsize=(12,6))

plt.plot(
    y_test,
    label="Actual",
    linewidth=2
)

plt.plot(
    predictions,
    label="Predicted",
    linewidth=2
)

plt.title("Actual vs Predicted Sentiment Index")

plt.xlabel("Test Samples")

plt.ylabel("Sentiment Index")

plt.legend()

plt.grid(True)

plt.show()

# =====================================
# Plot 3 - Scatter Plot
# =====================================

plt.figure(figsize=(6,6))

plt.scatter(
    y_test,
    predictions,
    alpha=0.6
)

plt.plot(
    [-1, 1],
    [-1, 1],
    'r--'
)

plt.title("Actual vs Predicted Scatter Plot")

plt.xlabel("Actual")

plt.ylabel("Predicted")

plt.grid(True)

plt.show()

print("\nDone!")