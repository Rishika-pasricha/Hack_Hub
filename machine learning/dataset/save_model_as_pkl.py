import pickle
import tensorflow as tf
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "saved_model" / "waste_classifier.h5"
PKL_PATH = BASE_DIR / "saved_model" / "waste_classifier.pkl"

# Load the model
model = tf.keras.models.load_model(MODEL_PATH)

# Save as pickle
with open(PKL_PATH, 'wb') as f:
    pickle.dump(model, f)

print("Model saved as pickle at:", PKL_PATH)