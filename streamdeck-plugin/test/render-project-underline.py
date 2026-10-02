"""Qt pixel regression: QT_QPA_PLATFORM=offscreen uv run --with PySide6 python test/render-project-underline.py"""
import json
import subprocess

from PySide6.QtGui import QGuiApplication, QImage, QPainter
from PySide6.QtSvg import QSvgRenderer


app = QGuiApplication([])
script = """
import { projectStatusImage } from './src/actions/project-status-image.mjs';
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"></svg>');
const cases = [];
for (const position of ['top', 'middle', 'bottom']) {
  const statusPosition = position === 'middle' ? 'top' : 'middle';
  for (const name of ['TEST', 'W'.repeat(100), '']) {
    for (const underline of [false, true]) {
      const settings = { projectName: name, namePosition: position, statusPosition, nameFontUnderline: underline };
      cases.push({ position, name, underline, svg: decodeURIComponent(projectStatusImage(image, 'READY', settings).split(',')[1]) });
    }
  }
}
console.log(JSON.stringify(cases));
"""
cases = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", script], encoding="utf-8"))


def render(svg):
    image = QImage(144, 144, QImage.Format_ARGB32)
    image.fill(0)
    painter = QPainter(image)
    renderer = QSvgRenderer(svg.encode("utf-8"))
    assert renderer.isValid()
    renderer.render(painter)
    painter.end()
    return image


for plain, underlined in zip(cases[::2], cases[1::2]):
    assert (plain["position"], plain["name"]) == (underlined["position"], underlined["name"])
    left, right = render(plain["svg"]), render(underlined["svg"])
    delta = [(x, y) for y in range(144) for x in range(144) if left.pixel(x, y) != right.pixel(x, y)]
    assert bool(delta) == bool(plain["name"]), (plain["position"], plain["name"], len(delta))
    if delta:
        assert all(8 <= x < 136 for x, _ in delta)
        y0 = {"top": 8, "middle": 56, "bottom": 104}[plain["position"]]
        assert all(y0 <= y < y0 + 32 for _, y in delta)

print(f"PASS: {len(cases) // 2} Qt-rendered project text pairs show only selected underlines")
