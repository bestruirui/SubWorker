import { ProxyUtils } from "@subconv";

type RouteContext = {
	request: Request;
	url: URL;
	params: Record<string, string>;
	env: Env;
};

type RouteHandler = (ctx: RouteContext) => Promise<Response> | Response;

type Route = {
	pattern: URLPattern;
	methods: string[];
	handler: RouteHandler;
};

/**
 * Fetch and parse proxies from multiple URLs
 */
async function fetchAndParseProxies(urls: string[]) {
	const results = await Promise.all(
		urls.map(async (u) => {
			const res = await fetch(u);
			const text = await res.text();
			return ProxyUtils.parse(text);
		}),
	);
	return results.flat();
}

/**
 * Core logic lives inside Durable Object.
 * Worker entry just forwards requests to the DO.
 */
export class SubWorkerDO {
	private readonly env: Env;
	private readonly routes: Route[];

	constructor(state: DurableObjectState, env: Env) {
		this.env = env;
		this.routes = this.buildRoutes();
	}

	private buildRoutes(): Route[] {
		return [
			{
				pattern: new URLPattern({ pathname: "/:token/sub" }),
				methods: ["GET"],
				handler: async ({ url }) => {
					const target = url.searchParams.get("target") ?? "";
					const urlParam = url.searchParams.get("url") ?? "";
					const urls = urlParam ? urlParam.split("|").filter(Boolean) : [];

					const proxies = await fetchAndParseProxies(urls);
					const result = ProxyUtils.produce(proxies, target);

					return new Response(result, {
						status: 200,
						headers: { "content-type": "text/plain; charset=utf-8" },
					});
				},
			},
			{
				pattern: new URLPattern({ pathname: "/:token/sub" }),
				methods: ["POST"],
				handler: async ({ request }) => {
					const body = (await request.json()) as { urls: string[]; client: string };
					const { urls, client } = body;

					const proxies = await fetchAndParseProxies(urls);
					const par_res = ProxyUtils.produce(proxies, client);

					return Response.json({ status: "success", data: { par_res } }, { status: 200 });
				},
			},
			{
				pattern: new URLPattern({ pathname: "/:token/api/proxy/parse" }),
				methods: ["POST"],
				handler: async ({ request }) => {
					const body = (await request.json()) as { data: string; client: string };
					const { data, client } = body;
					const proxies = ProxyUtils.parse(data);
					const par_res = ProxyUtils.produce(proxies, client);
					return Response.json({ status: "success", data: { par_res } }, { status: 200 });
				},
			},
		];
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method.toUpperCase();

		for (const route of this.routes) {
			const match = route.pattern.exec(url);
			if (!match) continue;

			if (!route.methods.includes(method)) {
				return new Response("Method Not Allowed", { status: 405 });
			}

			const ctx: RouteContext = {
				request,
				url,
				params: match.pathname.groups as Record<string, string>,
				env: this.env,
			};
			return route.handler(ctx);
		}

		return new Response("Not Found", { status: 404 });
	}
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		const token = decodeURIComponent(url.pathname.split("/")[1] ?? "");

		if (token !== env.SECRET) {
			return new Response("Not Found", { status: 404 });
		}

		const stub = env.SubWorkerDO.getByName("global");
		return stub.fetch(request);
	},
} satisfies ExportedHandler<Env>;
