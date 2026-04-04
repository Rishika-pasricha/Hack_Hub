import os
import io
import json
import base64
import logging
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

# ================================
# LOGGING
# ================================
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ================================
# CONFIG
# ================================
PORT = 5001

# ================================
# LOAD MODEL
# ================================
BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "saved_model" / "waste_classifier.h5"
CLASS_PATH = BASE_DIR / "saved_model" / "class_names.json"

print("Loading model from:", MODEL_PATH)

model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_PATH, "r") as f:
    CLASS_NAMES = json.load(f)

print("MODEL LOADED SUCCESSFULLY ✅")

# ================================
# WASTE INFO (NLP LAYER)
# ================================
WASTE_INFO = {
    "biodegradable": {
        "treatment": "Compost in green bin",
        "decomposition": "Decomposes in 2–6 weeks",
        "tips": "Use compost pit or municipal wet waste collection"
    },
    "non_biodegradable": {
        "treatment": "Recycle in blue bin",
        "decomposition": "Takes hundreds of years",
        "tips": "Send to recycling center"
    }
}

# ================================
# ML PREDICTION
# ================================
def predict_with_model(image_bytes):
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))

        img_array = np.array(img)
        img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
        img_array = np.expand_dims(img_array, axis=0)

        preds = model.predict(img_array)

        class_idx = int(np.argmax(preds))
        confidence = float(np.max(preds))

        return CLASS_NAMES[class_idx], confidence

    except Exception as e:
        log.error(f"ML Error: {e}")
        return "unknown", 0.0

# ================================
# FLASK APP
# ================================
app = Flask(__name__)
CORS(app)

@app.route("/classify", methods=["POST"])
def classify():
    data = request.get_json()

    if not data or "image" not in data:
        return jsonify({"error": "Missing image"}), 400

    image_b64 = data["image"]

    if "," in image_b64:
        image_b64 = image_b64.split(",")[1]

    image_bytes = base64.b64decode(image_b64)

    category, confidence = predict_with_model(image_bytes)

    info = WASTE_INFO.get(category, {
        "treatment": "Unknown",
        "decomposition": "Unknown",
        "tips": "Try clearer image"
    })

    return jsonify({
        "class": category,
        "confidence": confidence,
        "treatment": info["treatment"],
        "decomposition": info["decomposition"],
        "tips": info["tips"]
    })

# ================================
# RUN SERVER
# ================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)