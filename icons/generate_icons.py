import os
import subprocess
import sys

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.join(script_dir, 'logo.png')
    
    if not os.path.exists(logo_path):
        print(f"Error: Master logo not found at {logo_path}")
        return

    # Try Pillow first if available
    try:
        from PIL import Image
        print("Using Pillow (PIL) for image resizing...")
        img = Image.open(logo_path).convert("RGBA")
        for size in [16, 32, 48, 128]:
            out_file = os.path.join(script_dir, f'icon-{size}.png')
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(out_file, "PNG")
            print(f"Generated {out_file} ({size}x{size})")
        print("Done!")
        return
    except ImportError:
        pass

    # Fallback to PowerShell System.Drawing (built-in on Windows)
    print("Pillow not installed. Using Windows System.Drawing via PowerShell...")
    ps_cmd = f"""
    Add-Type -AssemblyName System.Drawing
    $src = [System.Drawing.Image]::FromFile('{logo_path}')
    $sizes = @(16, 32, 48, 128)
    foreach ($s in $sizes) {{
        $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)
        $rect = New-Object System.Drawing.Rectangle(0, 0, $s, $s)
        $g.DrawImage($src, $rect, 0, 0, $src.Width, $src.Height, [System.Drawing.GraphicsUnit]::Pixel)
        $out = Join-Path '{script_dir}' "icon-$s.png"
        $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $bmp.Dispose()
        Write-Output "Generated: $out"
    }}
    $src.Dispose()
    """
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], check=True)
    print("Done regenerating icons!")

if __name__ == '__main__':
    main()

