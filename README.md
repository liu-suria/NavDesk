# NavDesk

部署在 EdgeOne 的私有导航，原生 HTML/CSS/JavaScript，无前端框架、外部字体或构建依赖。手机以浏览为主，电脑支持完整维护。

## 打开顺序

1. HTML 头部启动唯一的导航请求，同时解析内联首屏样式，先显示页面外壳。
2. `/api/navigation?view=list` 完成鉴权后显示分类和网址，不传回收站。私有网址不在鉴权前展示，也不写入公共缓存。
3. 列表绘制后加载视口附近图标，最多 4 路并发；失败保留首字。
4. 点击时才下载编辑、排序、管理、万年历及对应弹窗样式。登录续期模块仅在会话失效时加载。

主题和置顶读取失败不会阻断打开。接口故障显示重试；无 Service Worker，不用旧的私有内容伪装即时加载。列表速度仍受真实鉴权和 Blob 延迟影响。

## 维护源码

| 文件 | 用途 |
| --- | --- |
| `templates/home.html`、`app.js`、`style.css` | 首屏外壳、列表、搜索、时钟和浏览交互 |
| `services.js` | 首页与管理页共用的数据读写、置顶存储接口 |
| `boot.js`、`icons.js` | 提前请求、主题、图标分批加载 |
| `editor.mjs`、`templates/editor.html` | 桌面快捷编辑、右键菜单、网址与置顶排序 |
| `manage.mjs`、`model.mjs` | 分类维护、导入、备份、回收站、检查 |
| `recovery.mjs`、`interactions.css` | 按需登录续期和弹窗样式 |
| `calendar.mjs`、`calendar-data/` | 按需万年历与内置年度数据 |
| `admin/`、`templates/admin.html` | 仍可使用的独立管理入口 |
| `edge-functions/` | 鉴权、私有存储、图标、日历 API |

`index.html`、`admin/index.html`、根目录带内容哈希的 `.mjs` 是生成文件。不要手动编辑它们；发布时需一起上传。构建更新模块引用及独立缓存规则，成功写出页面后删除过期的本地哈希产物。HTML 重新验证，私有接口 no-store，哈希静态模块长期缓存。

```sh
npm run build
node --test tests/*.test.mjs
npm run preview
```

本地预览：[http://127.0.0.1:8766/](http://127.0.0.1:8766/)，密码 `demo`。仅绑定本机，导航数据和登录为内存模拟，不连接线上 Blob，重启前需备份本地演示修改。日历查询可访问公开数据源。生产保留 EdgeOne Secrets `ADMIN_PASSWORD`、`SESSION_SECRET`，私有 Blob 空间 `navdesk-data`。

## 当前功能与边界

- 桌面：分类增删改和排序；网址添加、编辑、移动、删除、图标刷新；批量网址去重、Chrome HTML 书签导入；完整 JSON 备份恢复、回收站恢复/彻底删除/清空、退出登录。
- 手机：紧凑双列按钮，无编辑入口、顶部分类筛选或主题按钮；一行日期/农历/时间；分类折叠记忆和返回顶部。
- 本地搜索按空格分隔多个关键词，匹配名称、网址、备注和分类，高亮名称。回车筛选收藏，搜索互联网是独立操作。
- 常用置顶及顺序只存当前浏览器 localStorage，可单独备份；完整导航备份包含分类、网址、设置和回收站，不包含本地置顶。
- 登录失效保留当前页面输入。编辑只合并用户修改字段，重叠冲突允许查看最新值后重新提交；`updatedAt` 是尽力冲突保护，不是 Blob 原子写锁。关闭/刷新标签页不保留编辑草稿。
- 自动图标使用固定 Yandex 小尺寸图片入口，gstatic 32 像素和 DuckDuckGo 作为备用；避免原 Google 跳转入口失败。服务端 Blob v4 缓存 30 天，失败及旧图标重试间隔 1 小时，使用 EdgeOne 原生连接/读取超时 2.5 秒、图片上限 64 KB；禁止跳转和任意目标抓取。优先请求上游已缩小压缩的 PNG，不在边缘运行重型图像编码器。自定义 HTTPS 图标由浏览器直连。新增后预热，刷新失败保留可用旧图标。
- 手动失效检查最多 100 条、3 路并发、6 秒超时；跨域或登录限制标为无法确认，不自动删除。
- 限额：30 分类，每类 150 网址，回收站 500 项，导入预览 1000 条。
- 万年历区分节日、节气与放假调休。2026 放假安排内置；其他年份可手动更新第三方年度数据。节气使用香港天文台年度表。来源和覆盖范围在日历中展示，加载失败保留原显示。

## 验证与发布

最新首屏重构记录见 `REFACTOR_AUDIT.md` 和 `REFACTOR_PERFORMANCE.json`；较早的 `PERFORMANCE_RESULTS.json` 和 `PERFORMANCE_REVIEW_2026-09-23.json` 仅作历史测量参考。构建测试约束首屏 gzip 不超过 14 KiB，并检查所有延迟模块引用。

main 分支推送自动发布到 EdgeOne。发布验收须核对线上文件、模块 MIME、鉴权和实际浏览器行为；本地模拟速度不代表正式环境 SLA。

## 模块接口

`services.js` 提供不依赖 DOM 的导航与置顶接口。首页和独立管理页分别注入自己的数据读取、页面更新和存储回调；管理模块通过 `createManager(services)` 创建实例，不读取页面全局对象。编辑模块只接收导航、置顶、图标、提示和管理入口五项接口，自己的 DOM 操作留在模块内部。登录续期通过参数接收请求方法。

首屏仍保留启动与图标服务的页面级实例；非首屏模块不直接访问这些全局实例。管理功能仍按一组加载，共用弹窗样式，并未拆成每个按钮一个请求。旧版首屏重构记录：首页 gzip 13,809 B，29 项测试通过；已回归新增、编辑、置顶/排序、修改网址后置顶迁移、登录续期、备份恢复、独立管理入口和手机启动。该段为此前本地重构的历史记录。

## 认证网址管理 API

所有接口仅在鉴权后访问私有 Blob，返回 `Cache-Control: no-store`。助手可使用现有登录 Cookie，也可使用 `POST /api/auth/token/`（JSON `{ "password": "<现有管理密码>" }`）获取 30 天有效的签名 Bearer token。已经登录时也可提交空 JSON，用有效会话签发令牌。令牌与密码都是凭据，不写入仓库、URL 或日志；令牌随现有 SESSION_SECRET 的轮换失效。API 不开放 CORS，跨站写入 Origin 被拒绝。

- `GET /api/manage/`：读取完整导航（含分类 ID、链接 ID、updatedAt、回收站）。
- `POST /api/manage/`：提交一项操作，必填读取到的 `updatedAt`；失效版本返回 409。
- `action` 支持 `group.create`、`group.update`、`group.delete`、`link.create`、`link.update`、`link.move`、`link.delete`。
- 分类操作使用 `groupId`，链接操作使用 `groupId` 和 `linkId`；移动增加 `targetGroupId`。新增/修改字段放在 `value`；分类支持 name/icon/color，链接支持 name/url/description/icon/openInNew。新增 ID 由服务器生成，重复新增网址被拒绝。
- 每次成功修改前在同一私有 Blob 写入 `navigation/backups/<时间>-<UUID>.json`；备份失败则拒绝修改，删除保留至回收站。不要用公开 Blob URL访问备份。

例如（凭据从安全环境读取，不填写进示例文件）：

```json
{"action":"link.create","groupId":"<分类 ID>","updatedAt":"<刚读取的版本>","value":{"name":"站点名称","url":"https://example.com/","description":"说明"}}
```

Blob 没有原子比较交换；再次检查版本可减少冲突，但不能保证同时写入的强一致事务。助手应串行执行操作并读取确认；该 API 适用于当前单管理员维护。备份按操作留存，需要后续按实际使用量制定保留策略。

ICO 备用资源自动提取最接近 32 像素的一帧，PNG 帧直接复用压缩字节，避免传输整个多分辨率图标。

供应商无图标时的 1×1 透明占位图被识别为失败，页面保留网址名称首字，避免隐藏回退后留下空白。

## 家庭事务与统一外观

首页采用 Family Hub 的暖白/豆沙粉配色，深色主题同步；背景只有静态渐变，玻璃模糊限制在家庭事务面板和切换栏。桌面（≥1100px）为分类、网址、370px 家庭事务三栏；较窄屏幕为顶部「网址导航 / 家庭事务」Tab，保留各页滚动位置。家庭事务界面由按需 `family.mjs` / `family.css` 提供，支持待办分类、搜索、新增、详情、编辑、完成与恢复。完整附件、循环规则和统计设置仍通过原站管理。

数据仍由 `https://home-ledger.667989.xyz/` 的原 API 和 `home-ledger-data` Blob 管理；NavDesk 不复制账本或循环维护逻辑。所有 `/api/family/*` 接口先验证导航登录，只允许固定上游和限定方法，并保留 HomeLedger revision 冲突响应。无需修改 HomeLedger 的部署或 iframe 安全策略。

默认首次在家庭事务面板输入原 HomeLedger 密码，服务端获取上游会话并以 AES-GCM 加密存入 Secure/HttpOnly/SameSite=Strict 的 `__Host-navdesk_family` Cookie；会话最长 30 天，不向页面暴露上游 token，也不把账本缓存到 localStorage。可选在 NavDesk Secrets 配置已有 `HOMELEDGER_API_KEY` 自动连接，密钥只存在服务端。断开按钮用于本地会话连接；服务端密钥模式刷新后会自动连接。导航 SESSION_SECRET 轮换会使加密连接失效。

移动端首次切到家庭事务才下载模块及读取账本；桌面在导航列表显示后利用空闲时间加载。账本连接失败不会隐藏或阻断网址。页面不会永久轮询。

## 中文拼音搜索

搜索网址名称、描述、分类与 URL 时支持中文、英文、全拼、首字母、大小写及中文/拼音混合输入，例如 `jingdong`、`jd`、`京dong`。纯中文查询保持文字精确包含关系。常见词组（重庆、银行、音乐等）补充组合读音；生僻字和多音词仍以字典/系统拼音排序为准。

`search.mjs` 和静态拼音字典只在搜索框获得焦点或输入时下载，匹配索引按文本缓存，输入期间无需联网查询。移出的搜索高亮代码抵消了新增工作空间壳的首屏成本，首页仍受 14 KiB gzip 测试预算约束。

静态拼音字典来自 [tiny-pinyin](https://github.com/creeperyang/pinyin) commit `b1b274fad82d6a52f4d5eacd8d94a61c4eb55800` 的 `src/dict.js`，仅改为 ES Module 导出；许可保留在 `vendor/pinyin-LICENSE.txt`。未新增运行时包依赖或外部 CDN 脚本。
