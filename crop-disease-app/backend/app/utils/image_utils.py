"""
Image processing utilities using OpenCV + Pillow.
"""
import os
import uuid
from pathlib import Path
from typing import Tuple

import cv2
import numpy as np
from PIL import Image, ExifTags

from app.core.config import settings


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
MAX_DIMENSION = 1024  # resize larger images


def validate_image(file_path: str) -> Tuple[bool, str]:
    """Validate that the file is a real, processable image."""
    path = Path(file_path)
    if path.suffix.lower() not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file type: {path.suffix}"
    try:
        img = Image.open(file_path)
        img.verify()
        return True, "ok"
    except Exception as e:
        return False, str(e)


def preprocess_image(input_path: str, output_dir: str = None) -> str:
    """
    - Fix EXIF orientation
    - Resize large images to MAX_DIMENSION
    - Convert to RGB
    - Save as JPEG
    Returns path to the processed image.
    """
    output_dir = output_dir or settings.UPLOAD_DIR
    img = Image.open(input_path)

    # Fix EXIF orientation
    try:
        for orientation_key in ExifTags.TAGS.keys():
            if ExifTags.TAGS[orientation_key] == "Orientation":
                break
        exif = img._getexif()
        if exif and orientation_key in exif:
            orientation = exif[orientation_key]
            rotations = {3: 180, 6: 270, 8: 90}
            if orientation in rotations:
                img = img.rotate(rotations[orientation], expand=True)
    except Exception:
        pass

    # Convert to RGB
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize if too large
    w, h = img.size
    if max(w, h) > MAX_DIMENSION:
        scale = MAX_DIMENSION / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # Enhance for better AI analysis
    img_array = np.array(img)
    img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    # Apply mild sharpening
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    img_cv = cv2.filter2D(img_cv, -1, kernel)
    img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
    final_img = Image.fromarray(img_rgb)

    # Save processed image
    out_filename = f"processed_{uuid.uuid4().hex}.jpg"
    out_path = os.path.join(output_dir, out_filename)
    final_img.save(out_path, "JPEG", quality=90)

    return out_path


def get_image_info(image_path: str) -> dict:
    """Return basic image metadata."""
    try:
        img = Image.open(image_path)
        return {
            "width": img.width,
            "height": img.height,
            "mode": img.mode,
            "format": img.format,
        }
    except Exception:
        return {}
