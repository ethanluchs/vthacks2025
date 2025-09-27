import cv2
import numpy as np
import pytesseract
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
import time
import base64
import tempfile
import os
import math
import shutil
import uuid

# render page and get screenshot
def capture_screenshot(url, screenshot_path="screenshot.png"):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url, timeout=30000)
        # time.sleep(3000)
        page.screenshot(path=screenshot_path, full_page=True)
        browser.close()
    return screenshot_path


# optical character recognition text detection
# takes in an image path and returns a list of tuples [x, y, w, h, text]
# x, y = top left of bounding box
# w, h = size of bounding box
def detect_text_regions(
        image_path,
        oem=3,   # OCR Engine Mode
        psm=12,   # Page Segmentation Mode
        min_conf=40,
        level="line"  # "word", "line", or "paragraph"
):
    """
    Detect text regions with adjustable granularity.
    Returns: List of tuples (x, y, w, h, text, conf).
    """

    # preprocessing the image
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    final = thresh.copy()

    # converting the image to usable data
    config = f"--oem {oem} --psm {psm}"
    data = pytesseract.image_to_data(final, output_type=pytesseract.Output.DICT, config=config)

    level_map = {"page": 1, "block": 2, "paragraph": 3, "line": 4, "word": 5}
    target_level = level_map.get(level, 5)  # default: word

    boxes = []
    n = len(data["level"])
    for i in range(n):
        if data["level"][i] == target_level:
            x, y, w, h = (
                data["left"][i],
                data["top"][i],
                data["width"][i],
                data["height"][i],
            )

            try:
                conf = int(float(data["conf"][i]))
            except ValueError:
                conf = -1

            text = data["text"][i].strip()

            # Skip unreasonably thin boxes
            aspect_ratio = w / float(h) if h > 0 else 0
            if w < 2 or h < 2:  # too small in either direction
                continue
            if aspect_ratio < 0.05 or aspect_ratio > 20:
                # extreme aspect ratios (tall-skinny or wide-flat lines)
                continue

            # For higher levels, text might be empty → try aggregating child words
            if text == "" and target_level < 5:
                words = []
                for j in range(n):
                    if (
                            data["level"][j] == 5  # word
                            and int(float(data["conf"][j])) >= min_conf
                            and data["left"][j] >= x
                            and data["top"][j] >= y
                            and data["left"][j] + data["width"][j] <= x + w
                            and data["top"][j] + data["height"][j] <= y + h
                    ):
                        words.append(data["text"][j].strip())
                text = " ".join(words)

            if conf >= min_conf or target_level < 5:
                boxes.append((x, y, w, h, text))

    print(boxes)
    return boxes



# WCAG luminance
# takes in rgb = [red, green, blue]
# returns a single number between 0 and 1 that tells us how bright a color is (0 is dark)
def relative_luminance(rgb):
    # convert RGB to relative luminance
    def f(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

# WCAG contrast
# returns ((L_lighter + 0.05) / (L_darker + 0.05))
# L is luminance
def contrast_ratio(fg, bg):
    L1, L2 = sorted([relative_luminance(fg), relative_luminance(bg)], reverse=True)
    return (L1 + 0.05) / (L2 + 0.05)

# analyze contrast of each text box
def analyze_contrast(image_path, boxes, out_path="annotated.png", wcag_threshold=4.5):
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)

    issues = []

    for (x, y, w, h, text) in boxes:
        region = img.crop((x, y, x+w, y+h))
        arr = np.array(region)

        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        text_pixels = arr[mask == 0]
        bg_pixels   = arr[mask == 255]

        if len(text_pixels) == 0 or len(bg_pixels) == 0:
            continue

        fg_color = np.median(text_pixels, axis=0)
        bg_color = np.median(bg_pixels, axis=0)
        ratio = contrast_ratio(fg_color, bg_color)

        if ratio < wcag_threshold:
            issues.append({
                "x": int(x), "y": int(y), "w": int(w), "h": int(h),
                "type": "low_contrast", "ratio": float(ratio), "text": text
            })
            draw.rectangle([x, y, x+w, y+h], outline="red", width=3)
            draw.text((x, y-12), f"{ratio:.2f}", fill="red")

    img.save(out_path)
    return out_path, issues

def _img_to_data_url(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode("ascii")

def split_image_vertically(image_path, tmp_dir, max_height=1080):
    """
    Split an image vertically into segments each with height <= max_height.
    Returns list of segment file paths (in tmp_dir) in top->bottom order.
    """
    img = Image.open(image_path)
    w, h = img.size
    if h <= max_height:
        return [image_path]

    segments = []
    parts = math.ceil(h / max_height)
    base = os.path.splitext(os.path.basename(image_path))[0]
    for i in range(parts):
        top = i * max_height
        bottom = min((i + 1) * max_height, h)
        segment = img.crop((0, top, w, bottom))
        seg_path = os.path.join(tmp_dir, f"{base}_part{i+1}.png")
        segment.save(seg_path)
        segments.append(seg_path)
    return segments

# Directory under the Next.js app's public/ so files are served at /analysis_images/<file>
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
PUBLIC_IMAGES_DIR = os.path.join(PROJECT_ROOT, 'web', 'public', 'analysis_images')
os.makedirs(PUBLIC_IMAGES_DIR, exist_ok=True)

def save_to_public(src_path, public_dir=PUBLIC_IMAGES_DIR, prefix='annotated', prefer_jpeg=False, jpeg_quality=80):
    """
    Copy/convert src_path into the project's web/public/analysis_images folder
    and return the relative URL path (e.g. /analysis_images/<filename>).
    Uses a uuid to avoid collisions.
    """
    ext = os.path.splitext(src_path)[1].lower()
    # choose extension
    if prefer_jpeg and ext not in ('.jpg', '.jpeg'):
        out_ext = '.jpg'
    else:
        out_ext = ext if ext in ('.png', '.jpg', '.jpeg') else '.png'

    name = f"{prefix}_{uuid.uuid4().hex}{out_ext}"
    dst = os.path.join(public_dir, name)

    try:
        img = Image.open(src_path).convert("RGB")
        if out_ext in ('.jpg', '.jpeg'):
            img.save(dst, format='JPEG', quality=jpeg_quality, optimize=True)
        else:
            img.save(dst, format='PNG', optimize=True)
    except Exception:
        # fallback to direct copy if Pillow save fails
        shutil.copy2(src_path, dst)

    return f"/analysis_images/{name}"

def analyze_url(url, tmp_dir=None, max_segment_height=1080):
    if tmp_dir is None:
        tmp_dir = tempfile.mkdtemp()
    screenshot_path = os.path.join(tmp_dir, "screenshot.png")
    capture_screenshot(url, screenshot_path)

    segment_paths = split_image_vertically(screenshot_path, tmp_dir, max_height=max_segment_height)
    screenshots = []
    for idx, seg_path in enumerate(segment_paths, start=1):
        boxes = detect_text_regions(seg_path)
        annotated_path, issues = analyze_contrast(seg_path, boxes, out_path=os.path.join(tmp_dir, f"annotated_part{idx}.png"))
        public_url = save_to_public(annotated_path, prefix=f"mainpage_part{idx}")
        screenshots.append({
            "url": public_url,
            "title": f"Main Page (part {idx}/{len(segment_paths)})",
            "issues": issues
        })

    return {
        "files": [],
        "screenshots": screenshots,
        "aria": {}, "altText": {}, "structure": {}
    }

def analyze_files(file_paths, tmp_dir=None, max_segment_height=1080):
    if tmp_dir is None:
        tmp_dir = tempfile.mkdtemp()
    screenshots = []
    all_files = []
    for p in file_paths:
        seg_paths = split_image_vertically(p, tmp_dir, max_height=max_segment_height)
        for idx, seg in enumerate(seg_paths, start=1):
            annotated_path, issues = analyze_contrast(seg, detect_text_regions(seg), out_path=os.path.join(tmp_dir, f"annotated_{os.path.basename(p)}_part{idx}.png"))
            public_url = save_to_public(annotated_path, prefix=f"{os.path.splitext(os.path.basename(p))[0]}_part{idx}")
            screenshots.append({
                "url": public_url,
                "title": f"{os.path.basename(p)} (part {idx}/{len(seg_paths)})",
                "issues": issues
            })
        all_files.append(os.path.basename(p))
    return {"files": all_files, "screenshots": screenshots, "aria": {}, "altText": {}, "structure": {}}

# ---------- Run the pipeline ----------
if __name__ == "__main__":
    # url = "https://black-glacier-0af5bd010.6.azurestaticapps.net/"
    url = "https://christopherkildea.github.io/"
    # screenshot = capture_screenshot(url)
    screenshot = "test_image2.png"
    # boxes = detect_text_regions(screenshot)
    boxes = detect_text_regions("test_image.png")
    annotated = analyze_contrast(screenshot, boxes)

    print(f"Annotated screenshot saved at: {annotated}")
