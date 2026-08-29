import { createLegacyMcpHandler } from "agents/mcp";
import { routeAgentRequest } from "agents";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

async function widgetHtml(request: Request, env: Env) {
  const origin = new URL(request.url).origin;
  const response = await env.ASSETS.fetch(new URL("/", origin));
  const html = await response.text();
  return html.replace(
    "</head>",
    `<script>window.__WUXING_RUNTIME__=${JSON.stringify({ origin })};</script></head>`,
  );
}

function createServer(request: Request, env: Env) {
  const server = new McpServer({ name: "五行阵", version: "0.2.0" });

  server.registerResource(
    "wuxing-widget",
    "ui://widget/index.html",
    {},
    async () => ({
      contents: [
        {
          uri: "ui://widget/index.html",
          mimeType: "text/html+skybridge",
          text: await widgetHtml(request, env),
        },
      ],
    }),
  );

  server.registerTool(
    "playWuxing",
    {
      title: "打开五行阵交互棋盘",
      description: "打开五行阵的对话内交互棋盘。",
      annotations: { readOnlyHint: true },
      _meta: {
        "openai/outputTemplate": "ui://widget/index.html",
        "openai/toolInvocation/invoking": "正在打开五行阵棋盘",
        "openai/toolInvocation/invoked": "五行阵棋盘已打开",
      },
    },
    async () => ({
      content: [
        {
          type: "text",
          text: "五行阵交互棋盘已打开，可以开始对局。",
        },
      ],
    }),
  );

  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      return createLegacyMcpHandler(createServer(request, env))(request, env, ctx);
    }

    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

export { WuxingGame } from "./game";
