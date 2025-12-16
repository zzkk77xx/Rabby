#!/usr/bin/env python3
"""
Script to modify icons in _raw/images/:
1. Only process files with 'icon' in the name
2. Rotate upside down (180 degrees)
3. Apply green color filter
"""

import os
from PIL import Image, ImageEnhance
import glob

def apply_green_filter(img):
    """Apply a green color filter to the image."""
    img = img.convert('RGBA')
    pixels = img.load()
    width, height = img.size

    for x in range(width):
        for y in range(height):
            r, g, b, a = pixels[x, y]

            # Apply green filter: boost green channel, reduce red and blue
            if a > 0:
                new_r = int(r * 0.4)
                new_g = int(min(255, g * 1.5))
                new_b = int(b * 0.4)
                pixels[x, y] = (new_r, new_g, new_b, a)

    return img

def modify_image(file_path):
    """Rotate image 180 degrees and apply green filter."""
    try:
        img = Image.open(file_path)

        # Rotate 180 degrees
        img = img.rotate(180)

        # Apply green filter
        img = apply_green_filter(img)

        # Save the modified image
        img.save(file_path)
        print(f"✓ Modified: {os.path.basename(file_path)}")

    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))

    print("Starting icon modification...")
    print("=" * 50)

    # Process only files with 'icon' in the name
    all_files = glob.glob(os.path.join(script_dir, "*"))
    icon_files = [f for f in all_files if 'icon' in os.path.basename(f).lower() and f.endswith(('.png', '.svg'))]

    print(f"\nProcessing {len(icon_files)} icon files...")
    for icon_file in icon_files:
        if icon_file.endswith('.png'):
            modify_image(icon_file)
        # Skip SVG for now since we're applying a basic filter

    print("\n" + "=" * 50)
    print("Icon modification complete!")

if __name__ == "__main__":
    main()
