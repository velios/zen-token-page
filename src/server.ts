const assets = new Map([
	["/", ["index.html", "text/html; charset=utf-8"]],
	["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
	["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
]);

const securityHeaders = {
	"Cache-Control": "no-store",
	"Content-Security-Policy":
		"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' https://api.zenmoney.ru; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
	"Referrer-Policy": "no-referrer",
	"X-Content-Type-Options": "nosniff",
};

export function createApp(publicDir = new URL("../public/", import.meta.url)) {
	return (req: Request): Response => {
		if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
		const asset = assets.get(new URL(req.url).pathname);
		if (!asset) return new Response("Not Found", { status: 404 });
		const [name, contentType] = asset;
		return new Response(Bun.file(new URL(name, publicDir)), {
			headers: { ...securityHeaders, "Content-Type": contentType },
		});
	};
}

if (import.meta.main) {
	const server = Bun.serve({
		hostname: "127.0.0.1",
		port: 3000,
		fetch: createApp(),
	});
	console.log(`ZenMoney Token Page: http://localhost:${server.port}`);
}
