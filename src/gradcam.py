"""Grad-CAM based tumor localization — draws a red circle around the detected region."""

import base64
import io

import numpy as np
import tensorflow as tf
from PIL import Image, ImageDraw


def generate_heatmap(model, img_array, class_idx=None):
    """
    Run Grad-CAM on the model for a pre-processed image (1, 224, 224, 3).

    The model is Sequential:
        [InceptionV3 (Functional)] -> Flatten -> ... -> Dense(4)

    Returns a base64 JPEG data-URL of the original image with a small red
    circle pinpointing the tumor region.
    """

    backbone = model.layers[0]
    conv_layer = backbone.get_layer("mixed10")

    inp = backbone.input
    conv_out = conv_layer.output
    x = backbone.output

    for layer in model.layers[1:]:
        x = layer(x)

    grad_model = tf.keras.Model(inputs=inp, outputs=[conv_out, x])
    img_tensor = tf.cast(img_array, tf.float32)

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_tensor)
        if class_idx is None:
            class_idx = int(tf.argmax(predictions[0]))
        loss = predictions[:, class_idx]

    grads = tape.gradient(loss, conv_outputs)              # (1, 5, 5, 2048)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))  # (2048,)

    conv_out_val = conv_outputs[0]                         # (5, 5, 2048)
    heatmap = conv_out_val @ pooled_grads[..., tf.newaxis] # (5, 5, 1)
    heatmap = tf.squeeze(heatmap).numpy()                  # (5, 5)

    heatmap = np.maximum(heatmap, 0)
    if heatmap.max() > 0:
        heatmap /= heatmap.max()

    # The heatmap is a 5×5 grid.  Each cell spans 224/5 ≈ 44.8 px.
    grid_h, grid_w = heatmap.shape
    cell_h = 224.0 / grid_h
    cell_w = 224.0 / grid_w

    # Find the single hottest cell (peak activation)
    peak_row, peak_col = np.unravel_index(np.argmax(heatmap), heatmap.shape)

    # Convert to pixel centre
    cx = int((peak_col + 0.5) * cell_w)
    cy = int((peak_row + 0.5) * cell_h)

    # Fixed small radius — roughly one grid cell, enough to highlight
    # the tumor area without covering the whole brain
    radius = int(cell_w * 0.7)  # ~31 px on a 224px image

    # Draw on the original image
    original_uint8 = np.clip(img_array[0] * 255, 0, 255).astype(np.uint8)
    pil_img = Image.fromarray(original_uint8).convert("RGB")

    draw = ImageDraw.Draw(pil_img)
    bbox = [cx - radius, cy - radius, cx + radius, cy + radius]
    draw.ellipse(bbox, outline="red", width=3)

    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=90)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"
