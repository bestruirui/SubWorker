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

export default app;
