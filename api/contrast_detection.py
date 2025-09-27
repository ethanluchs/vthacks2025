import cv2
import numpy as np
import pytesseract
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
import time

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
def analyze_contrast(image_path, boxes, out_path="annotated.png"):
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)

    for (x, y, w, h, text) in boxes:
        region = img.crop((x, y, x+w, y+h))
        arr = np.array(region)

        # Convert to grayscale for thresholding
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)

        # Adaptive threshold → separate text vs background pixels
        _, mask = cv2.threshold(gray, 0, 255,
                                cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Boolean masks for text vs background
        text_pixels = arr[mask == 0]    # black in mask → text
        bg_pixels   = arr[mask == 255]  # white in mask → background

        if len(text_pixels) == 0 or len(bg_pixels) == 0:
            continue  # skip weird cases

        # Median colors
        fg_color = np.median(text_pixels, axis=0)
        bg_color = np.median(bg_pixels, axis=0)

        # Contrast ratio
        ratio = contrast_ratio(fg_color, bg_color)

        if ratio < 10:  # WCAG AA threshold for normal text
            draw.rectangle([x, y, x+w, y+h], outline="red", width=3)
            draw.text((x, y-12), f"{ratio:.2f}", fill="red")

    img.save(out_path)
    return out_path



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
