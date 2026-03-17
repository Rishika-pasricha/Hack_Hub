"""
predict.py

Load trained model and predict waste type from image
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import matplotlib.pyplot as plt

MODEL_PATH = "model.h5"
IMG_SIZE = (128, 128)

# -------------------------------
# LOAD MODEL
# -------------------------------
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError("❌ model.h5 not found. Train first!")

model = tf.keras.models.load_model(MODEL_PATH)
print("✅ Model loaded successfully.")

# -------------------------------
# PREDICTION FUNCTION
# -------------------------------
def predict_image(img_path):
    if not os.path.exists(img_path):
        print(f"❌ File not found: {img_path}")
        return

    try:
        # Load image
        img = image.load_img(img_path, target_size=IMG_SIZE)
        img_array = image.img_to_array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Prediction
        prediction = model.predict(img_array)[0][0]

        # Class mapping
        if prediction > 0.5:
            label = "biodegradable (Food Waste/Other Trash)"
        else:
            label = "non - biodegradable (Plastic/Paper/Metal)"

        print("\n============================")
        print(f"📷 Image: {img_path}")
        print(f"🔍 Prediction: {label}")
        print("============================\n")

        # Visualization
        plt.imshow(img)
        plt.title(label)
        plt.axis('off')
        plt.show()

    except Exception as e:
        print(f"⚠️ Error processing image: {e}")


# -------------------------------
# RUN
# -------------------------------
# -------------------------------
# RUN LOOP (CONTINUOUS)
# -------------------------------
if __name__ == "__main__":
    while True:
        img_path = input("\nEnter image path (or 'q' to quit): ")

        if img_path.lower() == 'q':
            print("👋 Exiting...")
            break

        if not os.path.exists(img_path):
            print(f"❌ File not found: {img_path}")
            continue

        try:
            # Load image
            img = image.load_img(img_path, target_size=IMG_SIZE)
            img_array = image.img_to_array(img) / 255.0
            img_array = np.expand_dims(img_array, axis=0)

            # Prediction
            prediction = model.predict(img_array)[0][0]

            if prediction > 0.5:
                label = "NON-RECYCLABLE (Food Waste/Other Trash)"
            else:
                label = "RECYCLABLE (Plastic/Paper/Metal)"

            print("\n============================")
            print(f"📷 Image: {img_path}")
            print(f"🔍 Prediction: {label}")
            print("============================")

            # Show image (WAIT until closed)
            plt.imshow(img)
            plt.title(label)
            plt.axis('off')
            plt.show()   # <-- IMPORTANT: blocking (waits for close)

        except Exception as e:
            print(f"⚠️ Error: {e}")
