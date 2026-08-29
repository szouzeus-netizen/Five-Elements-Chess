# 五行阵 1v1 — 可部署版

这版不是原来的“原型棋盘”。它把规则判断放到 Worker 侧，前端只负责选择位置和显示状态；同一个 room 的双方通过 Durable Object 共享同一局状态。

## 文件结构

- `site/index.html` — 棋盘界面
- `site/board.png` — 五行阵三角棋盘底图
- `src/engine.ts` — 规则引擎
- `src/server.ts` — Cloudflare Worker + Durable Object
- `wrangler.jsonc` — Cloudflare 配置

**没有 `public/` 目录。**

## 部署

```bash
npm install
npx wrangler deploy
```

Cloudflare Dashboard 的 Build configuration：

- Build command：留空
- Deploy command：`npx wrangler deploy`
- Root directory：`/`

不要再运行 `npm run build`；这是故意做成无需 Vite 构建的 Worker + 静态 Assets 项目。

## 对局

- 黑方：`?room=main&side=black`
- 白方：`?room=main&side=white`
- 双方只要使用相同 `room` 即共享同一局。
- 默认起点：金。
- 黑方先行。

## 已实现的核心规则

- 三角形棋盘，25 个小三角形。
- 大棋是完整的四小三角形组合；只能选择完整大三角形位置，绝不部分覆盖。
- 小棋只能吃对方、且被自己五行克制的小棋；不能吃大棋，不能吃自己的同级棋。
- 只有大棋能吃自己的小棋。
- 大棋吃对方小棋时，不能吃“克制该大棋”的对方小棋；也不能落在该小棋上或让其完整边封住大棋。
- 大棋吃大棋时，只能吃对方、且被自己克制的大棋；不能吃自己的大棋，也不能部分覆盖其他大棋。
- 每种上级大棋供应 2 个，因此同一种大棋可以同时存在两个；用完后不能继续炼化。
- 三个同元素小棋（手牌和棋盘上由自己控制的均可）可以炼化成对应上级大棋，并立即放置。
- 黑白双方手牌、下一张、大小棋供应、最近行动均公开。
- 支持撤回上一手和整局重置。
- 棋盘占领、逼停、五行大成三种胜利条件。
- 淼、森、焱、垚、鑫的放置能力均有对应处理入口，并继续遵守放置规则。

## 一个重要说明

旧版 HTML 的源码自己就写明了“正式规则中的吃子/替代判定会在规则引擎中处理”，因此它本来就是原型，不是完整规则实现。这个项目从规则引擎重新实现，而不是继续给原型打补丁。
