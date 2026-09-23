# NavDesk

部署在 EdgeOne 的私有个人导航。电脑和手机使用同一套原生 HTML/CSS/JavaScript 页面，导航内容经登录校验后从私有 Blob 读取。

## 首次打开

- 首页和管理页的样式、脚本随 HTML 一次传输，首屏不再下载独立 JS/CSS。
- HTML 开始解析时并行请求 `/api/navigation`；静态页面先显示，私有链接仅在鉴权成功后显示。
- 主题在正文解析前应用；本地存储不可用不会阻断启动。
- 管理页启动仅一次数据请求；登录后直接读取导航，省去重复 session 请求。
- 默认图标使用名称首字，不再批量请求 Google favicon。自定义图标仍按需加载，失败保留首字。
- 请求超时及服务异常显示重试；没有加入 Service Worker 或私有数据的共享 CDN 缓存。
- 手机按钮最小触摸区域 44 px，搜索和密码输入 16 px，减少输入时自动缩放；关闭手机顶栏背景模糊。

## EdgeOne 配置

保留原有 Secrets：`ADMIN_PASSWORD`、`SESSION_SECRET`。首次保存数据会自动创建私有 Blob 空间 `navdesk-data`。后端鉴权、Cookie、Blob 键和数据结构不变。

## 源码与生成

```sh
node scripts/build.mjs
```

构建仅用 Node 内置模块，不需要安装构建依赖。`templates/home.html`、`templates/admin.html`、`boot.js`、`app.js`、`admin/app.js` 和 CSS 是维护源文件；`index.html`、`admin/index.html` 是生成文件，随仓库发布。托管平台无需新增构建步骤。

共享启动逻辑位于 `boot.js`。修改前端后重新执行构建。HTML 配置重新验证或 no-store，避免长缓存导致旧页面一直存在。

## 本地演示

```sh
node scripts/preview.mjs
```

打开 `http://127.0.0.1:8766/`，演示密码 `demo`。预览仅绑定本机，使用内存里的模拟导航和登录；新增、排序、保存只作用于模拟数据，重启恢复。不连接线上 Blob。它不能验证 EdgeOne 实际登录、存储或线上速度。

`PERFORMANCE_RESULTS.json` 和 `REFACTOR_AUDIT.md` 记录本地电脑/手机冷加载与回归结果。
