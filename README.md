# SubWorker

Cloudflare Worker 订阅转换工具，支持多种主流代理软件格式。

## 支持的平台 (Target)

| 平台 | Parameter Keys |
| :--- | :--- |
| **Quantumult X** | `qx`, `QX`, `QuantumultX` |
| **Surge** | `surge`, `Surge`, `SurgeMac` |
| **Loon** | `Loon` |
| **Clash** | `Clash` |
| **Clash Meta / Mihomo** | `meta`, `clashmeta`, `clash.meta`, `Clash.Meta`, `ClashMeta`, `mihomo`, `Mihomo` |
| **Stash** | `stash`, `Stash` |
| **Shadowrocket** | `shadowrocket`, `Shadowrocket`, `ShadowRocket` |
| **Surfboard** | `surfboard`, `Surfboard` |
| **Sing-box** | `singbox`, `sing-box` |
| **Egern** | `egern`, `Egern` |
| **V2Ray** | `v2`, `v2ray`, `V2Ray` |
| **URI** | `uri`, `URI` |
| **JSON** | `json`, `JSON` |

## 使用方式

### 1. 部署方式

1.  复制 [worker.js](../../blob/dist/worker.js) 的文件内容。
2.  在 Cloudflare Workers 中新建一个 Worker，将代码粘贴覆盖并部署。
3.  进入 Worker 的 **Settings** -> **Variables**，添加一个名为 `SECRET` 的环境变量，并设置自定义密钥（例如 `my-secret-token`）。

### 2. 接口调用

接口遵循以下格式：

```
GET <WORKER_DOMAIN>/<SECRET>/sub?target=<TARGET>&url=<URLS>
```

*注意：`<SECRET>` 对应 Worker 环境变量中设置的 `SECRET` 值。*

### 3. 参数说明

- **target**: 目标平台格式（请参考上方支持列表）。
- **url**: 原始订阅链接。
    - **多订阅合并**：如果需要合并多个订阅，请使用竖线 `|` 分隔链接。
    - **URL 编码**：最终拼接后的字符串必须进行 **URL Encode** 编码。

### 4. 请求示例 

假设：
- Worker 域名: `example.workers.dev`
- `SECRET`: `129438`
- 目标平台: `mihomo`
- 原始订阅:
    1. `https://example.com/sub1`
    2. `https://example.com/sub2`

**步骤：**

1.  **拼接**: `https://example.com/sub1|https://example.com/sub2`
2.  **编码**: `https%3A%2F%2Fexample.com%2Fsub1%7Chttps%3A%2F%2Fexample.com%2Fsub2`
3.  **最终 URL**:

```
https://example.workers.dev/129438/sub?target=mihomo&url=https%3A%2F%2Fexample.com%2Fsub1%7Chttps%3A%2F%2Fexample.com%2Fsub2
```

