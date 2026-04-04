import base64
import importlib
import io
import json
import os
import sys
import traceback
from typing import Optional

import numpy as np
from PIL import Image


def resolve_load_model():
    try:
        return importlib.import_module("tensorflow.keras.models").load_model
    except Exception:
        return importlib.import_module("keras.models").load_model


load_model = resolve_load_model()


MODEL_PATH = os.environ.get("WASTE_MODEL_PATH")
CLASS_NAMES_PATH = os.environ.get("WASTE_CLASS_NAMES_PATH")

if not MODEL_PATH:
    print(json.dumps({"type": "startup_error", "error": "WASTE_MODEL_PATH is not set"}), flush=True)
    sys.exit(1)


def load_class_names(file_path: Optional[str]):
    if not file_path or not os.path.exists(file_path):
        return None

    with open(file_path, "r", encoding="utf-8") as fp:
        payload = json.load(fp)

    if isinstance(payload, list):
        return [str(item) for item in payload]

    if isinstance(payload, dict):
        if all(str(k).isdigit() for k in payload.keys()):
            ordered = sorted(payload.items(), key=lambda kv: int(kv[0]))
            return [str(item[1]) for item in ordered]
        return [str(item) for item in payload.values()]

    return None


try:
    model = load_model(MODEL_PATH)
    class_names = load_class_names(CLASS_NAMES_PATH)

    input_shape = model.input_shape
    if isinstance(input_shape, list):
        input_shape = input_shape[0]

    target_height = int(input_shape[1]) if len(input_shape) > 2 and input_shape[1] else 224
    target_width = int(input_shape[2]) if len(input_shape) > 2 and input_shape[2] else 224

    print(
        json.dumps(
            {
                "type": "ready",
                "targetHeight": target_height,
                "targetWidth": target_width,
            }
        ),
        flush=True,
    )
except Exception as exc:
    print(json.dumps({"type": "startup_error", "error": str(exc), "trace": traceback.format_exc()}), flush=True)
    sys.exit(1)


for raw_line in sys.stdin:
    line = raw_line.strip()
    if not line:
        continue

    request_id = None
    try:
        request = json.loads(line)
        request_id = request.get("id")
        image_data_url = str(request.get("imageDataUrl") or "")

        if "," not in image_data_url:
            raise ValueError("Invalid image data URL")

        encoded = image_data_url.split(",", 1)[1]
        image_bytes = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((target_width, target_height))

        image_array = np.asarray(image, dtype=np.float32)
        image_array = image_array / 255.0
        batch = np.expand_dims(image_array, axis=0)

        prediction = model.predict(batch, verbose=0)
        scores = np.squeeze(prediction)

        if scores.ndim == 0:
            scores = np.array([float(scores)], dtype=np.float32)

        scores = np.array(scores, dtype=np.float32)
        best_index = int(np.argmax(scores))
        best_score = float(scores[best_index])

        labels = class_names if class_names and len(class_names) == len(scores) else [f"class_{idx}" for idx in range(len(scores))]

        probabilities = []
        for index, score in enumerate(scores.tolist()):
            probabilities.append({
                "label": str(labels[index]),
                "score": float(score)
            })

        probabilities = sorted(probabilities, key=lambda item: item["score"], reverse=True)

        response = {
            "type": "result",
            "id": request_id,
            "label": str(labels[best_index]),
            "confidence": best_score,
            "probabilities": probabilities[:3],
        }
        print(json.dumps(response), flush=True)
    except Exception as exc:
        print(
            json.dumps(
                {
                    "type": "error",
                    "id": request_id,
                    "error": str(exc),
                }
            ),
            flush=True,
        )
