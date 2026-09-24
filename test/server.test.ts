import { afterAll, expect, test } from "bun:test";
import { createApp } from "../src/server";

const server = Bun.serve({ port: 0, fetch: createApp() });
const base = `http://localhost:${server.port}`;

afterAll(() => server.stop());

test("serves the token page with isolated local assets", async () => {
	const response = await fetch(base);
	const html = await response.text();
	expect(response.status).toBe(200);
	expect(response.headers.get("cache-control")).toBe("no-store");
	expect(response.headers.get("content-security-policy")).toContain(
		"script-src 'self'",
	);
	expect(html).toContain('<script src="/app.js"></script>');
	expect(html).toContain("Удалить из браузера");
});

test("serves local OAuth mode and rejects unknown paths", async () => {
	const script = await (await fetch(base + "/app.js")).text();
	expect(script).toContain("http://localhost:3000");
	expect(script).toContain("/oauth2/token/");
	expect((await fetch(base + "/token")).status).toBe(404);
});
