import { createMcpHandler } from "agents/mcp";
import { routeAgentRequest } from "agents";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { env } from "cloudflare:workers";

const getWidgetHtml = async (host: string) => {
  let html = await (await env.ASSETS.fetch("http://localhost/")).text();
  return html.replace("<!--RUNTIME_CONFIG-->", `<script>window.HOST=${JSON.stringify(host)};</script>`);
};

function createServer() {
  const server = new McpServer({name:"五行阵",version:"0.1.0"});
  server.registerResource("wuxing","ui://widget/index.html",{},async (_uri,extra)=>({
    contents:[{uri:"ui://widget/index.html",mimeType:"text/html+skybridge",
      text:await getWidgetHtml((extra.requestInfo?.headers.host as string)||"")}]
  }));
  server.registerTool("playWuxing",{
    title:"打开五行阵交互棋盘",
    annotations:{readOnlyHint:true},
    _meta:{
      "openai/outputTemplate":"ui://widget/index.html",
      "openai/toolInvocation/invoking":"正在打开五行阵棋盘",
      "openai/toolInvocation/invoked":"五行阵棋盘已打开"
    }
  },async()=>({content:[{type:"text",text:"五行阵交互棋盘已打开，可以开始对局。"}]}));
  return server;
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext) {
    const url=new URL(req.url);
    if(url.pathname.startsWith("/mcp")) return createMcpHandler(createServer())(req,env,ctx);
    return (await routeAgentRequest(req,env)) ?? new Response("Not found",{status:404});
  }
} satisfies ExportedHandler<Env>;

export { WuxingGame } from "./game";
