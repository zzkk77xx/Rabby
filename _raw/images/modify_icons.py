#!/usr/bin/env python3
"""
Script to modify SVG icons in src/ui/assets/:
1. Only process SVG files with 'rabby', 'logo', or 'icon' in the name
2. Rotate upside down (180 degrees)
3. Apply green color filter
"""

import os
import glob
import xml.etree.ElementTree as ET
import re

def modify_svg(file_path):
    """Rotate SVG 180 degrees and apply green color filter."""
    try:
        # Register SVG namespace to preserve it in output
        ET.register_namespace('', 'http://www.w3.org/2000/svg')

        tree = ET.parse(file_path)
        root = tree.getroot()

        # Get the SVG namespace
        ns = {'svg': 'http://www.w3.org/2000/svg'}

        # Get viewBox or width/height to calculate center point for rotation
        viewbox = root.get('viewBox')
        if viewbox:
            _, _, width, height = map(float, viewbox.split())
            cx, cy = width / 2, height / 2
        else:
            width = float(root.get('width', '100').replace('px', ''))
            height = float(root.get('height', '100').replace('px', ''))
            cx, cy = width / 2, height / 2

        # Wrap all content in a group with rotation and green filter
        # Create a new group element
        g = ET.Element('g')
        g.set('transform', f'rotate(180 {cx} {cy})')
        g.set('style', 'filter: url(#greenFilter)')

        # Move all children to the group
        for child in list(root):
            root.remove(child)
            g.append(child)

        # Create green color matrix filter
        defs = ET.Element('defs')
        filter_elem = ET.SubElement(defs, 'filter', id='greenFilter')
        color_matrix = ET.SubElement(filter_elem, 'feColorMatrix', type='matrix')
        # Matrix that boosts green, reduces red and blue
        color_matrix.set('values', '0.4 0 0 0 0  0 1.5 0 0 0  0 0 0.4 0 0  0 0 0 1 0')

        # Add defs and group to root
        root.insert(0, defs)
        root.append(g)

        # Write back to file
        tree.write(file_path, encoding='utf-8', xml_declaration=True)
        print(f"✓ Modified: {os.path.basename(file_path)}")

    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Navigate from _raw/images/ to project root, then to src/ui/assets/
    project_root = os.path.join(script_dir, '..', '..')
    assets_dir = os.path.join(project_root, 'src', 'ui', 'assets')
    assets_dir = os.path.abspath(assets_dir)

    print("Starting SVG icon modification...")
    print("=" * 50)
    print(f"Searching in: {assets_dir}")

    if not os.path.exists(assets_dir):
        print(f"✗ Error: Directory not found: {assets_dir}")
        return

    # Find all SVG files recursively
    all_svg_files = glob.glob(os.path.join(assets_dir, "**", "*.svg"), recursive=True)

    # Filter for files with 'rabby', 'logo', or 'icon' in the name
    target_files = []
    for f in all_svg_files:
        basename = os.path.basename(f).lower()
        if 'rabby' in basename or 'logo' in basename or 'icon' in basename:
            target_files.append(f)

    print(f"\nFound {len(target_files)} SVG files matching criteria...")
    print("\nFiles to be modified:")
    for f in target_files:
        rel_path = os.path.relpath(f, assets_dir)
        print(f"  - {rel_path}")

    print("\nProcessing files...")
    for svg_file in target_files:
        modify_svg(svg_file)

    print("\n" + "=" * 50)
    print(f"Icon modification complete! Modified {len(target_files)} files.")

if __name__ == "__main__":
    main()
