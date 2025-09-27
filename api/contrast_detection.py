import cv2
import numpy as np
from typing import List, Tuple, Optional
from playwright.sync_api import sync_playwright
from PIL import Image
import tempfile
import os
import shutil
import uuid
import math

# ---------------- Contrast helpers ----------------
def relative_luminance(rgb_color: np.ndarray) -> float:
    """rgb_color: array-like in RGB order (0..255)."""
    rgb = [v / 255.0 for v in rgb_color]
    def adjust(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [adjust(c) for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast_ratio(fg_rgb: np.ndarray, bg_rgb: np.ndarray) -> float:
    """WCAG contrast ratio: inputs must be RGB-order arrays (0..255)."""
    l1 = relative_luminance(fg_rgb)
    l2 = relative_luminance(bg_rgb)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)

# ---------------- EAST loader + detector ----------------
def load_east(east_path: str):
    net = cv2.dnn.readNet(east_path)
    return net

def _resize_to_multiple_of_32(img: np.ndarray, max_dim: int = 1280) -> Tuple[np.ndarray, float, float]:
    H, W = img.shape[:2]
    scale = 1.0
    if max(H, W) > max_dim:
        scale = max_dim / float(max(H, W))
    newW = int(np.ceil((W * scale) / 32.0) * 32)
    newH = int(np.ceil((H * scale) / 32.0) * 32)
    # protect against zero
    newW = max(32, newW)
    newH = max(32, newH)
    resized = cv2.resize(img, (newW, newH))
    rW = W / float(newW)
    rH = H / float(newH)
    return resized, rW, rH

def detect_text_regions(image: np.ndarray, net, conf_threshold: float = 0.5, nms_threshold: float = 0.4) -> List[Tuple[int,int,int,int]]:
    """
    Returns boxes as (startX, startY, endX, endY) in coordinates relative to the input image.
    `net` must be an already loaded EAST net (cv2.dnn.Net).
    """
    H, W = image.shape[:2]
    resized, rW, rH = _resize_to_multiple_of_32(image, max_dim=1280)  # tune max_dim if you want higher res
    blob = cv2.dnn.blobFromImage(resized, 1.0, (resized.shape[1], resized.shape[0]),
                                 (123.68, 116.78, 103.94), swapRB=True, crop=False)
    net.setInput(blob)
    layer_names = ["feature_fusion/Conv_7/Sigmoid", "feature_fusion/concat_3"]
    scores, geometry = net.forward(layer_names)

    rects = []
    confidences = []
    numRows, numCols = scores.shape[2], scores.shape[3]

    for y in range(numRows):
        scoresData = scores[0, 0, y]
        xData0 = geometry[0, 0, y]
        xData1 = geometry[0, 1, y]
        xData2 = geometry[0, 2, y]
        xData3 = geometry[0, 3, y]
        anglesData = geometry[0, 4, y]
        for x in range(numCols):
            if scoresData[x] < conf_threshold:
                continue
            offsetX = x * 4.0
            offsetY = y * 4.0
            angle = anglesData[x]
            cos = np.cos(angle)
            sin = np.sin(angle)
            h = xData0[x] + xData2[x]
            w = xData1[x] + xData3[x]
            endX = int(offsetX + (cos * xData1[x]) + (sin * xData2[x]))
            endY = int(offsetY - (sin * xData1[x]) + (cos * xData2[x]))
            startX = int(endX - w)
            startY = int(endY - h)
            rects.append((startX, startY, endX, endY))
            confidences.append(float(scoresData[x]))

    boxes = []
    if len(rects):
        indices = cv2.dnn.NMSBoxes(rects, confidences, conf_threshold, nms_threshold)
        if len(indices):
            # indices may be nested array; flatten safely
            inds = indices.flatten() if hasattr(indices, "flatten") else indices
            for i in inds:
                (sx, sy, ex, ey) = rects[i]
                # scale back to original image coordinates of the sub-image
                sx = max(0, int(sx * rW))
                sy = max(0, int(sy * rH))
                ex = min(W, int(ex * rW))
                ey = min(H, int(ey * rH))
                if ex - sx > 0 and ey - sy > 0:
                    boxes.append((sx, sy, ex, ey))
    return boxes

# ---------------- Splitting for tall images ----------------
def split_vertical_slices(image: np.ndarray, slice_aspect: float = 16/9.0) -> List[Tuple[int,int,np.ndarray]]:
    """Return list of (y0, y1, sub_img). If image isn't tall, returns single slice (0,H,image)."""
    H, W = image.shape[:2]
    slices = []
    if H / float(W) > slice_aspect:  # too tall; slice into HD-aspect chunks
        slice_h = int(W * slice_aspect)
        if slice_h <= 0:
            slice_h = H
        for y0 in range(0, H, slice_h):
            y1 = min(H, y0 + slice_h)
            slices.append((y0, y1, image[y0:y1, :].copy()))
    else:
        slices.append((0, H, image.copy()))
    return slices

# ---------------- Annotate + contrast calculation ----------------
def annotate_contrast(image: np.ndarray, boxes: List[Tuple[int,int,int,int]], pad: int = 8, wcag_threshold: float = 4.5) -> Tuple[np.ndarray, List[dict]]:
    """
    Draws boxes and contrast ratio text directly on `image` copy and returns it plus a list of issues.
    Issues contain box coordinates and ratio if below `wcag_threshold`.
    """
    out = image.copy()
    H, W = out.shape[:2]
    issues = []

    for (sx, sy, ex, ey) in boxes:
        # clip and sanity
        sx, sy = max(0, sx), max(0, sy)
        ex, ey = min(W, ex), min(H, ey)
        if ex <= sx or ey <= sy:
            continue

        roi = out[sy:ey, sx:ex]
        if roi.size == 0:
            continue

        # Try to segment text inside ROI using Otsu on grayscale.
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        try:
            _, mask_otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        except Exception:
            mask_otsu = np.ones_like(gray) * 255

        # Determine which part is likely the text: smaller region typically corresponds to text
        cnt_white = int(np.count_nonzero(mask_otsu == 255))
        cnt_black = mask_otsu.size - cnt_white
        if cnt_white == 0 or cnt_black == 0:
            # fallback: use whole ROI
            fg_pixels = roi.reshape(-1, 3)
        else:
            if cnt_white < cnt_black:
                fg_mask = (mask_otsu == 255)
            else:
                fg_mask = (mask_otsu == 0)
            # select full pixels (N,3) by indexing with boolean mask on 2D shape
            fg_pixels = roi[fg_mask]

            # If segmentation produced no pixels (weird), fallback to all pixels
            if fg_pixels.size == 0:
                fg_pixels = roi.reshape(-1, 3)

        # mean foreground color in BGR
        fg_color_bgr = np.mean(fg_pixels, axis=0)

        # Build background sampling region (pad around the box), then exclude the ROI area inside it
        bg_y0 = max(0, sy - pad)
        bg_y1 = min(H, ey + pad)
        bg_x0 = max(0, sx - pad)
        bg_x1 = min(W, ex + pad)
        bg_region = out[bg_y0:bg_y1, bg_x0:bg_x1].copy()

        # Coordinates of ROI inside bg_region
        roi_in_bg_y0 = sy - bg_y0
        roi_in_bg_y1 = roi_in_bg_y0 + (ey - sy)
        roi_in_bg_x0 = sx - bg_x0
        roi_in_bg_x1 = roi_in_bg_x0 + (ex - sx)

        # Zero-out the ROI area inside bg_region so it won't be counted as background
        # but keep the rest for sampling.
        bg_region[roi_in_bg_y0:roi_in_bg_y1, roi_in_bg_x0:roi_in_bg_x1] = 0

        # create per-pixel mask of non-zero (any channel != 0)
        if bg_region.size == 0:
            bg_pixels = np.array([], dtype=np.uint8).reshape(0,3)
        else:
            bg_mask = np.any(bg_region != 0, axis=2)
            if np.count_nonzero(bg_mask) == 0:
                # fallback: sample a thin border just outside ROI from the full image (not zeroed)
                top = out[max(0, sy - pad):sy, sx:ex]
                bottom = out[ey:min(H, ey + pad), sx:ex]
                left = out[sy:ey, max(0, sx - pad):sx]
                right = out[sy:ey, ex:min(W, ex + pad)]
                candidates = []
                if top.size: candidates.append(top.reshape(-1,3))
                if bottom.size: candidates.append(bottom.reshape(-1,3))
                if left.size: candidates.append(left.reshape(-1,3))
                if right.size: candidates.append(right.reshape(-1,3))
                if candidates:
                    bg_pixels = np.vstack(candidates)
                else:
                    bg_pixels = np.array([], dtype=np.uint8).reshape(0,3)
            else:
                bg_pixels = bg_region[bg_mask]

        # If background sampling failed entirely, fallback to median color of entire image
        if bg_pixels.size == 0:
            bg_color_bgr = np.median(out.reshape(-1, 3), axis=0)
        else:
            bg_color_bgr = np.mean(bg_pixels, axis=0)

        # convert BGR->RGB for luminance/contrast functions
        fg_rgb = fg_color_bgr[::-1]
        bg_rgb = bg_color_bgr[::-1]

        ratio = contrast_ratio(fg_rgb, bg_rgb)

        # Only annotate (draw rectangle + ratio text) when the ratio indicates a low-contrast issue.
        if ratio < wcag_threshold:
            # Draw rectangle and ratio for failing boxes (red)
            color_box = (0, 0, 255)
            cv2.rectangle(out, (sx, sy), (ex, ey), color_box, 2)

            text = f"{ratio:.2f}"
            # choose text color for readability: black or white depending on background luminance
            bg_lum = relative_luminance(bg_rgb)
            txt_color = (0, 0, 0) if bg_lum > 0.5 else (255, 255, 255)
            # Put text above the box if possible, else inside.
            text_pos = (sx, sy - 8) if sy - 12 > 0 else (sx + 4, sy + 12)
            cv2.putText(out, text, text_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.45, txt_color, 1, cv2.LINE_AA)

            issues.append({
                "x": int(sx), "y": int(sy), "w": int(ex-sx), "h": int(ey-sy),
                "type": "low_contrast", "ratio": float(ratio)
            })

    return out, issues

# ---------------- Main analyze function ----------------
def analyze_contrast(image_path: str, east_path: str = "frozen_east_text_detection.pb"):
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Couldn't open image: {image_path}")

    net = load_east(east_path)
    slices = split_vertical_slices(image, slice_aspect=16/9.0)
    boxes_global = []

    for (y0, y1, sub_img) in slices:
        # detect on the sub-image
        boxes = detect_text_regions(sub_img, net, conf_threshold=0.5, nms_threshold=0.4)
        # offset them back to original coordinates
        for (sx, sy, ex, ey) in boxes:
            boxes_global.append((sx, sy + y0, ex, ey + y0))

    annotated, issues = annotate_contrast(image, boxes_global)
    # avoid GUI calls on server; just return the annotated image and issues
    return annotated, issues

# --- Utilities to match legacy analyze_* API used by server.py ---

# Directory under the Next.js app's public/ so files are served at /analysis_images/<file>
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
PUBLIC_IMAGES_DIR = os.path.join(PROJECT_ROOT, 'web', 'public', 'analysis_images')
os.makedirs(PUBLIC_IMAGES_DIR, exist_ok=True)

def _img_to_data_url(path: str) -> str:
    with open(path, 'rb') as f:
        import base64
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('ascii')

def save_to_public(src_path: str, public_dir: str = PUBLIC_IMAGES_DIR, prefix: str = 'annotated', prefer_jpeg: bool = False, jpeg_quality: int = 80) -> str:
    ext = os.path.splitext(src_path)[1].lower()
    if prefer_jpeg and ext not in ('.jpg', '.jpeg'):
        out_ext = '.jpg'
    else:
        out_ext = ext if ext in ('.png', '.jpg', '.jpeg') else '.png'

    name = f"{prefix}_{uuid.uuid4().hex}{out_ext}"
    dst = os.path.join(public_dir, name)

    try:
        img = Image.open(src_path).convert('RGB')
        if out_ext in ('.jpg', '.jpeg'):
            img.save(dst, format='JPEG', quality=jpeg_quality, optimize=True)
        else:
            img.save(dst, format='PNG', optimize=True)
    except Exception:
        shutil.copy2(src_path, dst)

    return f"/analysis_images/{name}"

def split_image_vertically(image_path: str, tmp_dir: str, max_height: int = 1080) -> List[str]:
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

def capture_screenshot(url: str, screenshot_path: str = "screenshot.png") -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url, timeout=30000)
        page.screenshot(path=screenshot_path, full_page=True)
        browser.close()
    return screenshot_path

def analyze_url(url: str, tmp_dir: Optional[str] = None, max_segment_height: int = 1080, east_path: str = "frozen_east_text_detection.pb"):
    if tmp_dir is None:
        tmp_dir = tempfile.mkdtemp()
    screenshot_path = os.path.join(tmp_dir, "screenshot.png")
    capture_screenshot(url, screenshot_path)

    segment_paths = split_image_vertically(screenshot_path, tmp_dir, max_height=max_segment_height)
    screenshots = []

    net = load_east(east_path)

    for idx, seg_path in enumerate(segment_paths, start=1):
        img = cv2.imread(seg_path)
        if img is None:
            continue
        # detect boxes
        slices = split_vertical_slices(img, slice_aspect=16/9.0)
        boxes_global = []
        for (y0, y1, sub_img) in slices:
            boxes = detect_text_regions(sub_img, net, conf_threshold=0.5, nms_threshold=0.4)
            for (sx, sy, ex, ey) in boxes:
                boxes_global.append((sx, sy + y0, ex, ey + y0))

        annotated, issues = annotate_contrast(img, boxes_global)
        out_path = os.path.join(tmp_dir, f"annotated_part{idx}.png")
        cv2.imwrite(out_path, annotated)
        public_url = save_to_public(out_path, prefix=f"mainpage_part{idx}")
        screenshots.append({
            "url": public_url,
            "title": f"Main Page (part {idx}/{len(segment_paths)})",
            "issues": issues
        })

    return {"files": [], "screenshots": screenshots, "aria": {}, "altText": {}, "structure": {}}

def analyze_files(file_paths: List[str], tmp_dir: Optional[str] = None, max_segment_height: int = 1080, east_path: str = "frozen_east_text_detection.pb"):
    if tmp_dir is None:
        tmp_dir = tempfile.mkdtemp()
    screenshots = []
    all_files = []

    net = load_east(east_path)

    for p in file_paths:
        seg_paths = split_image_vertically(p, tmp_dir, max_height=max_segment_height)
        for idx, seg in enumerate(seg_paths, start=1):
            img = cv2.imread(seg)
            if img is None:
                continue
            slices = split_vertical_slices(img, slice_aspect=16/9.0)
            boxes_global = []
            for (y0, y1, sub_img) in slices:
                boxes = detect_text_regions(sub_img, net, conf_threshold=0.5, nms_threshold=0.4)
                for (sx, sy, ex, ey) in boxes:
                    boxes_global.append((sx, sy + y0, ex, ey + y0))

            annotated, issues = annotate_contrast(img, boxes_global)
            out_name = f"annotated_{os.path.splitext(os.path.basename(p))[0]}_part{idx}.png"
            out_path = os.path.join(tmp_dir, out_name)
            cv2.imwrite(out_path, annotated)
            public_url = save_to_public(out_path, prefix=f"{os.path.splitext(os.path.basename(p))[0]}_part{idx}")
            screenshots.append({
                "url": public_url,
                "title": f"{os.path.basename(p)} (part {idx}/{len(seg_paths)})",
                "issues": issues
            })
        all_files.append(os.path.basename(p))
    return {"files": all_files, "screenshots": screenshots, "aria": {}, "altText": {}, "structure": {}}

# ---------------- Example usage ----------------
if __name__ == "__main__":
    # Replace these with your paths
    IMAGE_PATH = "test_image2.png"
    EAST_PATH = "frozen_east_text_detection.pb"
    out = analyze_contrast(IMAGE_PATH, EAST_PATH)
    # optionally save result
    cv2.imwrite("annotated_result.png", out)
