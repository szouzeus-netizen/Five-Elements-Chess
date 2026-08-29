# 五行阵

这是可直接部署到 Cloudflare Workers + Durable Objects 的多人网页版。项目已经包含 `src/` 和 `site/`，**不需要在 Cloudflare 手动创建 `site` 文件夹，也不要把旧版文件和新版混在一起。**

## GitHub / Cloudflare 部署

1. 将本项目 ZIP 解压后，把项目根目录的全部内容上传到 GitHub 仓库根目录。
2. Cloudflare Workers & Pages → 连接这个 GitHub 仓库。
3. Production branch：`main`。
4. Root directory：`/`。
5. **Build command 留空**。本项目没有 Vite 构建步骤，Cloudflare 直接由 Wrangler 部署 Worker 和 `site/` 静态资源。
6. Deploy command：`npx wrangler deploy`。
7. 首次部署成功后打开 Worker URL。

如果仓库里已有旧版 `src`、旧 `site`、旧 `public` 或旧 `wrangler.json`，最稳妥的方式是：**先清空仓库，再把本 ZIP 解压后的全部文件一次性上传**。不要把两个版本拼接。

## 游戏实现的关键规则

- 小棋同级只能吃对方同级，并按五行克制关系判断。
- 大棋可以覆盖/吃自己的小棋，不按克制关系限制；对方小棋中，只有“克制该大棋”的小棋会禁止该大棋落点，其余可吃。
- 大棋吃大棋时，只能吃对方、且被自己克制的大棋，并要求完整覆盖同一个大三角形。
- 大棋落点检查的是其覆盖的 **4 个小三角形区域**，不是一个抽象中心点。
- 大棋供应为每种 2 枚；只有从供应区炼化出的对应大棋才计入该方“五行大成”记录。后来从对方处夺来的大棋只是自己的资源，不会凭空增加“五行大成”进度。
- 炼化必须使用自己控制的 3 个同五行小棋；3 个可以来自场上、手牌或两者混合。
- 垚只能翻转相邻的对方小棋；不发动能力不会自动破坏自己的保护链，也不会把对方资源凭空变成自己的。
- 五行胜利、棋盘占领胜利、逼停均在服务器端判定。
- Durable Object 保存房间状态；同一个 `?room=房间名` 即可共享同一局。

## 目录

```text
.
├── package.json
├── wrangler.jsonc
├── README.md
├── tsconfig.json
├── src/
│   ├── engine.ts
│   └── server.ts
└── site/
    ├── index.html
    └── board.png
```
