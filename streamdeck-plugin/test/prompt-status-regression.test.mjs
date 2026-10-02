import assert from "node:assert/strict";
import test from "node:test";
import { StatusActionRenderer } from "../src/actions/status-action-renderer.ts";
import { PARTICLE_WAIT_ANIMATION } from "../src/actions/particle-wait-animation.ts";

for (const resting of ["READY", "ATTENTION", "ERROR", "OFFLINE"]) {
	test(`project key updates on repeated prompts after ${resting}`, async (t) => {
		t.mock.timers.enable({ apis: ["setInterval"] });
		const images = [];
		const key = { id: "project", async setTitle() {}, async setImage(image) { images.push(image); } };
		const renderer = new StatusActionRenderer();
		t.after(() => renderer.dispose(key.id));
		renderer.configureProject(key.id, { projectName: "SD Plug" });
		const flush = () => new Promise(resolve => setImmediate(resolve));
		for (let prompt = 0; prompt < 3; prompt++) {
			const count = images.length;
			renderer.setStatus("BUSY", [key]);
			await flush();
			assert.ok(images.length > count, "each prompt must immediately replace the static image");
			assert.match(decodeURIComponent(images.at(-1)), /BUSY/);
			const firstFrame = images.at(-1);
			t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs);
			await flush();
			assert.notEqual(images.at(-1), firstFrame, "restarted animation must keep advancing");
			renderer.setStatus(resting, [key]);
			await flush();
			assert.match(decodeURIComponent(images.at(-1)), new RegExp(resting));
		}
	});
}
