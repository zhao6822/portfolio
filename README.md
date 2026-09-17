# 作品集

赵鹏的工作成果记录网站。静态站点，免费托管在 Cloudflare Pages。
仓库：https://github.com/zhao6822/portfolio

## 日常怎么用

1. 打开网站地址 + `/admin/`
2. 用 GitHub 账号登录一次
3. 点「项目成果 → New」，填表单，右上角 Publish

保存后约 1 分钟网站自动更新。

## 改网站信息

编辑 `src/site.ts`（名字、简介、邮箱、外链），保存后推送即可。

## 文件说明

```
src/site.ts                 网站基本信息，改这一个文件就够
src/content/projects/       每个项目一个 .md 文件（后台自动生成）
src/content.config.ts       条目字段定义
public/admin/config.yml     后台表单字段定义（需与上一行文件保持一致）
public/images/              图片
functions/api/auth.js       后台登录的 GitHub 授权代理
```

## 首次配置（已完成的部分）

- [x] 建仓库并推送代码
- [x] 后台配置里的仓库名（zhao6822/portfolio）
- [ ] 注册 GitHub OAuth App
- [ ] Cloudflare Pages 连接仓库
- [ ] 填写三个环境变量

### 注册 GitHub OAuth App

github.com → Settings → Developer settings → OAuth Apps → New OAuth App

| 字段 | 值 |
|---|---|
| Application name | 作品集后台 |
| Homepage URL | 你的 Cloudflare 地址 |
| Authorization callback URL | `https://你的Cloudflare地址/api/auth/callback` |

记下 Client ID 和 Client secret。

### Cloudflare Pages

Workers & Pages → Create → Pages → Connect to Git → 选 zhao6822/portfolio
构建配置：Framework `Astro`，Build command `npm run build`，输出目录 `dist`

### 环境变量

项目 → Settings → Environment variables：

| 变量 | 值 |
|---|---|
| `GITHUB_CLIENT_ID` | OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | OAuth App 的 Client secret |
| `REDIRECT_URL` | `https://你的Cloudflare地址/api/auth/callback` |

填完重新部署一次生效。
