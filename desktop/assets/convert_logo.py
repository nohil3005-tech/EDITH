import os
from PIL import Image

def main():
    src_logo = r"C:\Users\ARTIST NSB\.gemini\antigravity-ide\brain\4e9e85d0-051d-430e-a145-5f6efda0d7ac\media__1781978400443.jpg"
    dest_ico = r"C:\1\EDITH\desktop\assets\icon.ico"
    dest_png = r"C:\1\EDITH\desktop\assets\icon.png"
    dest_frontend = r"C:\1\EDITH\frontend\public\logo.png"

    print(f"Reading source logo: {src_logo}")
    if not os.path.exists(src_logo):
        print(f"Error: Source logo not found at {src_logo}")
        return

    # Open image
    img = Image.open(src_logo)

    # 1. Save as multi-resolution ICO for Windows application
    print(f"Generating multi-resolution ICO at: {dest_ico}")
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(dest_ico, format="ICO", sizes=ico_sizes)
    print("ICO generated successfully.")

    # 2. Save as PNG for Electron window/tray icon fallback
    print(f"Generating PNG at: {dest_png}")
    img_png = img.resize((256, 256), Image.Resampling.LANCZOS)
    img_png.save(dest_png, format="PNG")
    print("PNG generated successfully.")

    # 3. Save as PNG for Frontend display
    print(f"Generating Frontend PNG at: {dest_frontend}")
    os.makedirs(os.path.dirname(dest_frontend), exist_ok=True)
    img_frontend = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_frontend.save(dest_frontend, format="PNG")
    print("Frontend PNG generated successfully.")

if __name__ == "__main__":
    main()
