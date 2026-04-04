
import os
import json
import random
import shutil
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight

# ================================
# CONFIG
# ================================

BASE_DIR     = Path(__file__).parent
DATASET_DIR  = BASE_DIR / "dataset"
SPLIT_DIR    = BASE_DIR / "split_dataset"
OUTPUT_DIR   = BASE_DIR / "saved_model"

IMG_SIZE     = (224, 224)
BATCH_SIZE   = 32
EPOCHS       = 30
FINE_EPOCHS  = 15
TEST_SPLIT   = 0.20
SEED         = 42

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ================================
# STEP 1: CLASS DISCOVERY
# ================================

class_dirs = sorted([d for d in DATASET_DIR.iterdir() if d.is_dir()])
CLASS_NAMES = [d.name for d in class_dirs]

print(f"\nFound classes: {CLASS_NAMES}")

# ================================
# STEP 2: SPLIT DATA
# ================================

def build_split_directory():
    if SPLIT_DIR.exists():
        shutil.rmtree(SPLIT_DIR)

    for cls in CLASS_NAMES:
        src = DATASET_DIR / cls
        images = list(src.glob("*.jpg")) + list(src.glob("*.png"))

        random.seed(SEED)
        random.shuffle(images)

        train_imgs, val_imgs = train_test_split(
            images, test_size=TEST_SPLIT, random_state=SEED
        )

        for split, img_list in [("train", train_imgs), ("val", val_imgs)]:
            dest = SPLIT_DIR / split / cls
            dest.mkdir(parents=True, exist_ok=True)
            for img in img_list:
                shutil.copy(img, dest / img.name)

build_split_directory()

# ================================
# STEP 3: DATA GENERATORS
# ================================

train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,
    rotation_range=25,
    width_shift_range=0.2,
    height_shift_range=0.2,
    zoom_range=0.25,
    horizontal_flip=True,
    brightness_range=[0.7, 1.3],
)

val_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input
)

train_gen = train_datagen.flow_from_directory(
    SPLIT_DIR / "train",
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=True,
)

val_gen = val_datagen.flow_from_directory(
    SPLIT_DIR / "val",
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False,
)

# ================================
# STEP 4: CLASS WEIGHTS
# ================================

class_weights = compute_class_weight(
    class_weight="balanced",
    classes=np.unique(train_gen.classes),
    y=train_gen.classes
)

class_weights = dict(enumerate(class_weights))
print("Class weights:", class_weights)

# ================================
# STEP 5: MODEL
# ================================

base_model = MobileNetV2(
    input_shape=(*IMG_SIZE, 3),
    include_top=False,
    weights="imagenet"
)

base_model.trainable = False

inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
x = base_model(inputs, training=False)

x = layers.GlobalAveragePooling2D()(x)
x = layers.BatchNormalization()(x)
x = layers.Dense(256, activation="relu")(x)
x = layers.Dropout(0.5)(x)
x = layers.Dense(128, activation="relu")(x)
x = layers.Dropout(0.3)(x)

outputs = layers.Dense(len(CLASS_NAMES), activation="softmax")(x)

model = models.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

# ================================
# STEP 6: TRAIN PHASE 1
# ================================

print("\nTraining Phase 1...\n")

history1 = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS,
    class_weight=class_weights,
    callbacks=[
        callbacks.EarlyStopping(patience=5, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(patience=3)
    ]
)

# ================================
# STEP 7: FINE-TUNING
# ================================

base_model.trainable = True

for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

print("\nFine-tuning...\n")

history2 = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=FINE_EPOCHS,
    class_weight=class_weights,
    callbacks=[
        callbacks.EarlyStopping(patience=4, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(patience=2)
    ]
)

# ================================
# STEP 8: SAVE MODEL
# ================================

model.save(OUTPUT_DIR / "waste_classifier.h5")

with open(OUTPUT_DIR / "class_names.json", "w") as f:
    json.dump(CLASS_NAMES, f)

print("\nModel saved successfully!")

# ================================
# STEP 9: EVALUATION
# ================================

val_gen.reset()
preds = model.predict(val_gen)

y_pred = np.argmax(preds, axis=1)
y_true = val_gen.classes

print("\nClassification Report:")
print(classification_report(y_true, y_pred, target_names=CLASS_NAMES))

val_loss, val_acc = model.evaluate(val_gen)
print(f"\nValidation Accuracy: {val_acc * 100:.2f}%")