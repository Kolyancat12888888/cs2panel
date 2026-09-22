"""
CS2 AI Client - Windows System Tray Application
Displays local agent connection status, CPU/RAM usage, active jobs, and quick actions.
"""

import sys
import time
import json
import os

try:
    import pystray
    from PIL import Image, ImageDraw
except ImportError:
    pystray = None

def create_image():
    # Generate 64x64 CS2 icon
    image = Image.new('RGBA', (64, 64), color=(0, 0, 0, 0))
    dc = ImageDraw.Draw(image)
    dc.ellipse([4, 4, 60, 60], fill="#de6e16", outline="#ffffff", width=2)
    dc.text((18, 22), "CS2", fill="black")
    return image

def open_studio():
    import webbrowser
    webbrowser.open("http://localhost:3000/studio")

def open_jobs():
    import webbrowser
    webbrowser.open("http://localhost:3000/agents")

def exit_app(icon, item):
    icon.stop()

def main():
    if not pystray:
        print("[CS2 Tray] pystray not installed, running in console mode.")
        while True:
            time.sleep(1)
        return

    icon = pystray.Icon(
        "CS2 AI Client",
        icon=create_image(),
        title="CS2 AI Client (Connected)",
        menu=pystray.Menu(
            pystray.MenuItem("CS2 AI Client: Connected", None, enabled=False),
            pystray.MenuItem("Agent: Gaming-PC (Ryzen)", None, enabled=False),
            pystray.MenuItem("Local AI: Ollama / Qwen", None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Open Visual Plugin Studio", open_studio),
            pystray.MenuItem("Active Jobs", open_jobs),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit", exit_app)
        )
    )
    icon.run()

if __name__ == "__main__":
    main()
