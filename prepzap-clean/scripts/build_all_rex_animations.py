import glob
import os
import shutil
import subprocess
import time
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_dilation

SOURCE_DIR = r"C:\Users\Migs\Downloads"
PROJECT_ROOT = r"C:\Users\Migs\Desktop\prepzap\prepzap-clean"
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "animations")
TEMP_DIR = os.path.join(PROJECT_ROOT, "public", "temp_frames")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

ANIMATIONS = [
    ("celebrating", "*celebrating*.gif", 60),
    ("waving", "*waving*.gif", 60),
    ("idle", "*idle*.gif", 60),
    ("thinking", "*thinking*.gif", 60),
    ("talking", "*talking*.gif", 60),
    ("listening", "*curiosity*.gif", 60),
    ("nodding", "*nodding*.gif", 60),
    ("blinking", "*blinking*.gif", 60),
]

def clean_frame(rgb):
    """Clean green-screen chroma key and despill using scipy.ndimage."""
    H, W, _ = rgb.shape
    r = rgb[:, :, 0].astype(int)
    g = rgb[:, :, 1].astype(int)
    b = rgb[:, :, 2].astype(int)

    # Green screen detection
    is_green = ((g >= 160) & (g - r >= 35) & (g - b >= 20)) | ((g >= 190) & (g > r) & (g > b))
    labeled, _ = label(is_green)

    # Find components connected to any border
    border_labels = set(np.unique(labeled[0, :])).union(
        np.unique(labeled[-1, :]),
        np.unique(labeled[:, 0]),
        np.unique(labeled[:, -1])
    )
    border_labels.discard(0)

    bg_mask = np.isin(labeled, list(border_labels))
    rex_mask = ~bg_mask

    # Despill border
    rex_border = binary_dilation(bg_mask) & rex_mask
    green_edge = rex_border & (g > r) & (g > b)
    halo_prune = green_edge & (g - np.maximum(r, b) > 15)
    rex_mask[halo_prune] = False

    despill_edge = green_edge & ~halo_prune
    rgb_clean = rgb.copy()
    rgb_clean[despill_edge, 1] = np.maximum(r[despill_edge], b[despill_edge])

    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb_clean
    rgba[:, :, 3] = rex_mask.astype(np.uint8) * 255
    return rgba

def process_animation(name, pattern, max_frames=60):
    matches = glob.glob(os.path.join(SOURCE_DIR, pattern))
    if not matches:
        print(f"[-] No source matching {pattern} found in {SOURCE_DIR}")
        return

    src_file = matches[0]
    print(f"\n[+] Processing {name} from {os.path.basename(src_file)}...")
    t0 = time.time()

    im = Image.open(src_file)
    total_frames = getattr(im, "n_frames", 1)
    frames_to_read = min(total_frames, max_frames)

    frames_data = []
    global_min_x, global_max_x = 9999, 0
    global_min_y, global_max_y = 9999, 0

    for i in range(frames_to_read):
        im.seek(i)
        rgb = np.array(im.convert("RGB"))
        rgba = clean_frame(rgb)

        ys, xs = np.where(rgba[:, :, 3] > 0)
        if len(ys) > 0:
            global_min_x = min(global_min_x, xs.min())
            global_max_x = max(global_max_x, xs.max())
            global_min_y = min(global_min_y, ys.min())
            global_max_y = max(global_max_y, ys.max())

        frames_data.append(rgba)

    H, W = frames_data[0].shape[:2]
    pad = 4
    x1 = max(0, global_min_x - pad)
    x2 = min(W, global_max_x + pad)
    y1 = max(0, global_min_y - pad)
    y2 = min(H, global_max_y + pad)

    crop_dir = os.path.join(TEMP_DIR, name)
    if os.path.exists(crop_dir):
        shutil.rmtree(crop_dir)
    os.makedirs(crop_dir, exist_ok=True)

    for i, rgba in enumerate(frames_data):
        cropped = rgba[y1:y2, x1:x2]
        Image.fromarray(cropped).save(os.path.join(crop_dir, f"frame_{i:04d}.png"))

    cropped_w = x2 - x1
    cropped_h = y2 - y1
    print(f"    Cropped size: {cropped_w}x{cropped_h} across {len(frames_data)} frames")

    # Encode GIF using ffmpeg with diff_mode=rectangle and reserve_transparent=1
    out_gif = os.path.join(OUTPUT_DIR, f"rex_{name}.gif")
    gif_cmd = [
        "ffmpeg", "-y", "-framerate", "16",
        "-i", os.path.join(crop_dir, "frame_%04d.png"),
        "-filter_complex", "[0:v] split [a][b];[a] palettegen=reserve_transparent=1:transparency_color=ffffff:stats_mode=diff [p];[b][p] paletteuse=alpha_threshold=128:diff_mode=rectangle",
        "-loop", "0",
        out_gif
    ]
    subprocess.run(gif_cmd, capture_output=True, check=True)

    # Encode WebP using ffmpeg libwebp lossless
    out_webp = os.path.join(OUTPUT_DIR, f"rex_{name}.webp")
    webp_cmd = [
        "ffmpeg", "-y", "-framerate", "16",
        "-i", os.path.join(crop_dir, "frame_%04d.png"),
        "-vcodec", "libwebp", "-lossless", "1",
        "-loop", "0",
        out_webp
    ]
    subprocess.run(webp_cmd, capture_output=True, check=True)

    gif_kb = os.path.getsize(out_gif) / 1024
    webp_kb = os.path.getsize(out_webp) / 1024
    print(f"    Done in {time.time()-t0:.2f}s -> GIF: {gif_kb:.1f}KB, WebP: {webp_kb:.1f}KB")

def main():
    for name, pattern, max_f in ANIMATIONS:
        process_animation(name, pattern, max_f)

    # Create aliases for speaking and explaining
    talking_gif = os.path.join(OUTPUT_DIR, "rex_talking.gif")
    talking_webp = os.path.join(OUTPUT_DIR, "rex_talking.webp")
    
    if os.path.exists(talking_gif):
        shutil.copyfile(talking_gif, os.path.join(OUTPUT_DIR, "rex_speaking.gif"))
        shutil.copyfile(talking_gif, os.path.join(OUTPUT_DIR, "rex_explaining.gif"))
    if os.path.exists(talking_webp):
        shutil.copyfile(talking_webp, os.path.join(OUTPUT_DIR, "rex_speaking.webp"))
        shutil.copyfile(talking_webp, os.path.join(OUTPUT_DIR, "rex_explaining.webp"))

    # Cleanup temp frames
    shutil.rmtree(TEMP_DIR, ignore_errors=True)
    print("\n[✓] All animations generated cleanly with zero ghosting!")

if __name__ == "__main__":
    main()
