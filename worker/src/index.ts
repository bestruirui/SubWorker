import { Hono } from "hono";
import { ProxyUtils } from "@subconv"


const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/:token/sub", async (c) => {
  const token = c.req.param("token");
  if (c.env.SECRET && c.env.SECRET !== token) {
    return c.notFound();
  }

  const { target, url } = c.req.query();
  const urls = url ? (url as string).split("|") : [];

  const mid = (
    await Promise.all(
      urls.map(async (u) => {
        const res = await fetch(u);
        const text = await res.text();
        return ProxyUtils.parse(text);
      })
    )
  ).flat();

  const result = ProxyUtils.produce(mid, target as string);
  return c.text(result);
});

app.post("/:token/sub", async (c) => {
  const token = c.req.param("token");
  if (c.env.SECRET && c.env.SECRET !== token) {
    return c.notFound();
  }

  const body = await c.req.json();
  const { urls, client } = body as { urls: string[], client: string };

  const mid = (
    await Promise.all(
      urls.map(async (u) => {
        const res = await fetch(u);
        const text = await res.text();
        return ProxyUtils.parse(text);
      })
    )
  ).flat();

  var result: any = {};
  const par_res = ProxyUtils.produce(mid, client as string);
  result['par_res'] = par_res;
  return c.json({
    status: 'success',
    data: result,
  }, 200);
});

app.post("/:token/api/proxy/parse", async (c) => {
  const token = c.req.param("token");
  if (c.env.SECRET && c.env.SECRET !== token) {
    return c.notFound();
  }
  const body = await c.req.json();
  const { data, client } = body;
  const proxies = ProxyUtils.parse(data);
  var result: any = {};
  const par_res = ProxyUtils.produce(proxies, client as string);
  result['par_res'] = par_res;
  return c.json({
    status: 'success',
    data: result,
  }, 200);
});



export default app;
