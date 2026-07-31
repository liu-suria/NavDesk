# NavDesk

一个部署在 EdgeOne Makers 的私有个人导航页。原生 HTML/CSS/JavaScript，使用 Edge Functions 和 Blob，不需要 KV 或构建步骤。

## EdgeOne 配置

部署仓库后，在项目的 Secrets 中配置：

- `ADMIN_PASSWORD`
- `SESSION_SECRET`（建议 32 位以上随机字符串）

首次保存数据时会自动创建私有 Blob 空间 `navdesk-data`。

## 页面

- `/`：私有导航、全局搜索、深浅色主题
- `/admin/`：登录后管理分组与链接，支持拖动排序、导入与导出 JSON
