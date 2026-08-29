# 五行阵 · ChatGPT 对话内棋盘

这是一个 Cloudflare Workers + Vite + React + Agents + MCP 的最小可部署版本。

## Cloudflare 构建设置

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Production branch: `main`

## 重要

本版本固定了在 Cloudflare 构建日志中已经验证过的依赖版本，并加入 `agents/vite` 插件以正确处理 `@callable()` 装饰器。

`wrangler.jsonc` 使用 `2026-08-29` 作为 compatibility date，避免 Cloudflare 构建环境把 `2026-08-30` 判定为未来日期。

## GitHub 上传

如果 GitHub 网页一次只能上传单个文件，请保持以下结构：

```text
package.json
vite.config.ts
wrangler.jsonc
tsconfig.json
index.html
src/
  app.tsx
  game.ts
  index.ts
```

## 本地

```bash
npm install
npm run build
npx wrangler deploy
```
