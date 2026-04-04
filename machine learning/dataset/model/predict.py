import tensorflow as tf
import numpy as np
import json
from PIL import Image
import io
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "saved_model" / "waste_classifier.h5"
CLASS_PATH = BASE_DIR / "saved_model" / "class_names.json"

model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_PATH) as f:
    CLASS_NAMES = json.load(f)

def predict_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))

    img_array = np.array(img)
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
    img_array = np.expand_dims(img_array, axis=0)

    preds = model.predict(img_array)

    class_idx = np.argmax(preds)
    confidence = float(np.max(preds))

    return CLASS_NAMES[class_idx], confidence