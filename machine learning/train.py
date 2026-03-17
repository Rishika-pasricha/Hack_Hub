"""
train.py

Train a CNN (with Transfer Learning - MobileNetV2) for Waste Classification
"""

import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import ModelCheckpoint

# -------------------------------
# CONFIG
# -------------------------------
IMG_SIZE = (128, 128)
BATCH_SIZE = 32
EPOCHS = 10

TRAIN_DIR = "dataset/train"
TEST_DIR = "dataset/test"

MODEL_PATH = "model.h5"

# -------------------------------
# ERROR HANDLING
# -------------------------------
if not os.path.exists(TRAIN_DIR):
    raise FileNotFoundError(f"❌ Training folder not found: {TRAIN_DIR}")

if not os.path.exists(TEST_DIR):
    raise FileNotFoundError(f"❌ Testing folder not found: {TEST_DIR}")

print("✅ Dataset folders found.")

# -------------------------------
# DATA PREPROCESSING
# -------------------------------
train_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
    rotation_range=20,
    zoom_range=0.2,
    horizontal_flip=True
)

test_datagen = ImageDataGenerator(rescale=1./255)

train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',
    subset='training'
)

val_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary',
    subset='validation'
)

test_generator = test_datagen.flow_from_directory(
    TEST_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary'
)

# -------------------------------
# MODEL: Transfer Learning
# -------------------------------
print("🚀 Loading MobileNetV2...")

base_model = MobileNetV2(
    input_shape=(128, 128, 3),
    include_top=False,
    weights='imagenet'
)

base_model.trainable = False  # Freeze base

# Custom Head
x = base_model.output
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dense(128, activation='relu')(x)
x = layers.Dropout(0.5)(x)
output = layers.Dense(1, activation='sigmoid')(x)

model = models.Model(inputs=base_model.input, outputs=output)

# Compile
model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy']
)

model.summary()

# -------------------------------
# TRAINING
# -------------------------------
checkpoint = ModelCheckpoint(
    MODEL_PATH,
    monitor='val_accuracy',
    save_best_only=True,
    verbose=1
)

print("🔥 Training started...")

history = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS,
    callbacks=[checkpoint]
)

print("✅ Training complete!")

# -------------------------------
# EVALUATION
# -------------------------------
loss, acc = model.evaluate(test_generator)
print(f"📊 Test Accuracy: {acc:.2f}")

print(f"💾 Model saved as {MODEL_PATH}")