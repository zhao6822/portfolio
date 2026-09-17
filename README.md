# 个人作品集

记录工作中完成的项目成果。静态网站，免费托管。

## 日常怎么用

1. 打开你的网站地址 + `/admin/`（例如 `https://xxx.pages.dev/admin/`）
2. 用 GitHub 账号登录一次
3. 点「项目成果 → New」，填表单，右上角 Publish

保存后大约 1 分钟，网站自动更新。不用做别的。

## 文件说明

```
src/site.ts                 网站标题、你的名字、简介、联系方式 —— 改这一个文件就够
src/content/projects/       每个项目一个 .md 文件（后台会自动生成，不用手动建）
src/content.config.ts       项目条目的字段定义（要加字段才需要动）
public/admin/config.yml     后台表单的字段定义（要加字段才需要动）
public/images/              图片存放位置
functions/api/auth.js       后台登录用的 GitHub 授权代理
```

**注意**：`src/content.config.ts` 和 `public/admin/config.yml` 的字段必须一致。改了一个就要改另一个，否则保存会失败。

## 改网站信息

打开 `src/site.ts`，把里面的中文占位内容换成你自己的，保存后推送即可。

## 首次部署（只需做一次）

### 1. 建 GitHub 仓库

在 github.com 新建仓库，名字随意（比如 `portfolio`），设为 Public，不要勾选初始化。

### 2. 注册 GitHub OAuth App（后台登录用）

打开 github.com → Settings → Developer settings → OAuth Apps → New OAuth App：

| 字段 | 填什么 |
|---|---|
| Application name | 随便，比如「我的作品集后台」 |
| Homepage URL | 你的网站地址（可先填 `https://xxx.pages.dev`） |
| Authorization callback URL | `https://你的网站地址/api/auth/callback` |

创建后记下 **Client ID**，并点 Generate a new client secret 记下 **Client secret**（只显示一次）。

### 3. 部署到 Cloudflare Pages

1. 登录 Cloudflare → Workers & Pages → Create → Pages → Connect to Git
2. 选中刚建的仓库
3. 构建配置：
   - Framework preset：`Astro`
   - Build command：`npm run build`
   - Build output directory：`dist`
4. 保存并部署

### 4. 填环境变量

部署完成后，进项目 → Settings → Environment variables，加三个：

| 变量名 | 值 |
|---|---|
| `GITHUB_CLIENT_ID` | 第 2 步的 Client ID |
| `GITHUB_CLIENT_SECRET` | 第 2 步的 Client secret |
| `REDIRECT_URL` | `https://你的网站地址/api/auth/callback` |

加完重新部署一次（Deployments → Retry deployment）才会生效。

### 5. 改后台配置里的仓库名

打开 `public/admin/config.yml` 第一行，把 `你的用户名/你的仓库名` 换成真实的，例如 `zhangsan/portfolio`。改完推送。

## 本地预览（可选）

需要装 Node.js 22 以上，在项目目录执行：

```
npm install
npm run dev
```

然后打开 http://localhost:4321 。本地环境下后台登录不可用（需要线上授权），但看页面效果没问题。
