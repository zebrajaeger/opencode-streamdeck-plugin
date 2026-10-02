"""Pixel regression: uv run --with PySide6 python test/render-project-text.py

Uses Qt's SVG renderer, the rendering engine used by Stream Deck on Windows.
PySide6 is verification tooling only, not a plugin runtime dependency.
"""
import json
import subprocess
from PySide6.QtGui import QGuiApplication, QImage, QPainter
from PySide6.QtSvg import QSvgRenderer

app = QGuiApplication([])
script = """
import { projectStatusImage } from './src/actions/project-status-image.mjs';
const positions = ['top', 'middle', 'bottom'];
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" fill="#101216"/></svg>');
const cases = [];
for (const namePosition of positions) for (const statusPosition of positions) {
 if (namePosition === statusPosition) continue;
 for (const status of ['OFFLINE', 'READY', 'BUSY', 'ATTENTION', 'ERROR']) {
  for (const projectName of ['Alpha', 'W'.repeat(100), '日本語テスト', 'one\\ntwo', '']) {
   const svg = decodeURIComponent(projectStatusImage(image, status, {projectName, namePosition, statusPosition}).split(',')[1]);
   cases.push({namePosition, statusPosition, projectName, status, svg});
  }
 }
}
console.log(JSON.stringify(cases));
"""
cases = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", script], text=True, encoding="utf-8"))
bands = {"top": 8, "middle": 56, "bottom": 104}
for case in cases:
    image = QImage(144, 144, QImage.Format_ARGB32)
    image.fill(0)
    painter = QPainter(image)
    renderer = QSvgRenderer(case["svg"].encode("utf-8"))
    renderer.render(painter)
    painter.end()
    assert renderer.isValid(), case
    def bright(x, y):
        color = image.pixelColor(x, y)
        return min(color.red(), color.green(), color.blue()) > 180
    for label in ["status"] + (["name"] if case["projectName"] else []):
        y0 = bands[case[label + "Position"]]
        pixels = sum(bright(x, y) for y in range(y0, y0 + 32) for x in range(8, 136))
        assert pixels > 20, f"Invisible {label}: {case['status']} {case['namePosition']}/{case['statusPosition']}"
    occupied = {bands[case["statusPosition"]]}
    if case["projectName"]:
        occupied.add(bands[case["namePosition"]])
    assert not any(bright(x, y) for y in range(144) for x in range(144) if x < 8 or x >= 136 or not any(y0 <= y < y0 + 32 for y0 in occupied)), "Text escaped its assigned regions"
print(f"PASS: {len(cases)} Qt-rendered layouts/statuses/names contain visible, bounded text")
