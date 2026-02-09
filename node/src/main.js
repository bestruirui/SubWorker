import { createServer } from "node:http";
import { ProxyUtils } from "../../backend/dist/subconv.js";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const SECRET = process.env.SECRET || "secret";

/**
 * Parse JSON body from request
 */
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk.toString()));
        req.on("end", () => {
            try {
                resolve(JSON.parse(data));
            } catch {
                reject(new Error("Invalid JSON"));
            }
        });
        req.on("error", reject);
    });
}

/**
 * Send JSON response
 */
function sendJSON(res, data, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
}

async function handleProxyParse(req, res) {
    try {
        const body = await parseBody(req);
        const { data, client } = body;

        if (!data || !client) {
            return sendJSON(res, { status: "error", message: "Missing data or client" }, 400);
        }

        const proxies = ProxyUtils.parse(data);
        const par_res = ProxyUtils.produce(proxies, client);

        sendJSON(res, { status: "success", data: { par_res } });
    } catch (e) {
        sendJSON(res, { status: "error", message: e.message }, 500);
    }
}

/**
 * Main request handler
 */
async function handler(req, res) {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase() || "GET";

    // Route: POST /:secret/api/proxy/parse
    const match = pathname.match(/^\/([^/]+)\/api\/proxy\/parse$/);

    if (match) {
        const secret = decodeURIComponent(match[1]);

        if (secret !== SECRET) {
            return sendJSON(res, { status: "error", message: "Not Found" }, 404);
        }

        if (method !== "POST") {
            return sendJSON(res, { status: "error", message: "Method Not Allowed" }, 405);
        }

        return handleProxyParse(req, res);
    }

    sendJSON(res, { status: "error", message: "Not Found" }, 404);
}

const server = createServer(handler);

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log(`Route: POST /${SECRET}/api/proxy/parse`);
});
