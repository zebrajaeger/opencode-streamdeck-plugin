"""Qt smoke test: QT_QPA_PLATFORM=offscreen uv run --with PySide6 python test/render-global-status.py"""
import json
import subprocess

from PySide6.QtGui import QGuiApplication, QImage, QPainter
from PySide6.QtSvg import QSvgRenderer


app = QGuiApplication([])
script = """
import { statusFontImage } from './src/actions/project-status-image.mjs';
import { backgroundImage } from './src/actions/background-animation.ts';
import { ReadyPlasmaAnimation } from './src/actions/ready-plasma-animation.ts';
const staticImage = backgroundImage('<rect width="144" height="144" rx="18" fill="#101216"/><circle cx="72" cy="46" r="22" fill="#5D6470"/>');
const ready = new ReadyPlasmaAnimation(() => 0);
const animatedImage = backgroundImage(ready.background());
console.log(JSON.stringify([
  statusFontImage(staticImage, 'OFFLINE', {}),
  statusFontImage(animatedImage, 'READY', { statusFontFamily: 'Georgia', statusFontSize: 28, statusFontStyle: 'Bold', statusFontUnderline: true, statusFontColor: '#FF00AA' })
].map(image => decodeURIComponent(image.split(',')[1]))));
"""
svgs = json.loads(subprocess.check_output(["node", "--experimental-strip-types", "--input-type=module", "-e", script], encoding="utf-8"))
for svg in svgs:
    renderer = QSvgRenderer(svg.encode("utf-8"))
    assert renderer.isValid()
    image = QImage(144, 144, QImage.Format_ARGB32)
    image.fill("#101216")
    painter = QPainter(image)
    renderer.render(painter)
    painter.end()
    status_color = "#ff00aa" if "fill=\"#FF00AA\"" in svg else "#ffffff"
    pixels = sum(image.pixelColor(x, y).name() == status_color for y in range(56, 96) for x in range(8, 136))
    assert pixels > 0, (status_color, pixels)
    print("Rendered", "READY (custom font)" if status_color == "#ff00aa" else "OFFLINE (default font)", "visible text pixels:", pixels)
