// Display fixtures only; never imported by production pages or Edge Functions.
const groups = [
 ['common','日常常用','◈','#5678c5',[
  ['GitHub','github.com','代码托管与开源协作'],['Gmail','mail.google.com','邮件收发与日程往来'],['Notion','notion.so','知识整理与项目笔记'],['Google Drive','drive.google.com','文档与文件协作'],['飞书','feishu.cn','团队沟通与协同办公'],['腾讯文档','docs.qq.com','在线文档与表格'],['语雀','yuque.com','团队知识库'],['DeepL','deepl.com','多语言翻译']]],
 ['ai','AI 与创作','✦','#8a6bc1',[
  ['ChatGPT','chatgpt.com','通用助手与内容创作'],['Claude','claude.ai','长文写作与代码辅助'],['Gemini','gemini.google.com','多模态信息处理'],['DeepSeek','chat.deepseek.com','推理与知识问答'],['Kimi','kimi.com','长文档阅读助手'],['通义千问','tongyi.com','智能问答与办公助手'],['Perplexity','perplexity.ai','信息检索与来源整理'],['即梦 AI','jimeng.jianying.com','图片与视频创作']]],
 ['dev','开发工具','⌘','#4e8c9a',[
  ['Vercel','vercel.com','前端项目部署'],['Cloudflare','dash.cloudflare.com','域名、网络与边缘服务'],['MDN Web Docs','developer.mozilla.org','Web 技术参考文档'],['Stack Overflow','stackoverflow.com','开发问题与解答'],['npm','npmjs.com','JavaScript 软件包'],['Docker Hub','hub.docker.com','容器镜像与分发'],['CodePen','codepen.io','前端交互实验'],['JSON Editor','jsoneditoronline.org','JSON 查看与编辑']]],
 ['cloud','云服务与运维','☁','#658fbd',[
  ['腾讯云','cloud.tencent.com','云主机与基础设施'],['阿里云','aliyun.com','云计算与域名服务'],['AWS','aws.amazon.com','全球云基础设施'],['DigitalOcean','digitalocean.com','云主机与应用托管'],['Hetzner','hetzner.com','服务器与云资源'],['Oracle Cloud','cloud.oracle.com','云资源控制台'],['UptimeRobot','uptimerobot.com','站点可用性监测'],['Speedtest','speedtest.net','网络带宽测速']]],
 ['design','设计灵感','◐','#b57b88',[
  ['Figma','figma.com','界面设计与团队协作'],['Dribbble','dribbble.com','设计作品与灵感'],['Behance','behance.net','创意作品展示'],['Pinterest','pinterest.com','视觉素材收集'],['Unsplash','unsplash.com','摄影图片素材'],['Iconfont','iconfont.cn','矢量图标资源'],['Coolors','coolors.co','配色与色板生成'],['Canva','canva.com','在线平面设计']]],
 ['reading','资讯与阅读','▤','#78966c',[
  ['少数派','sspai.com','数字生活与效率'],['IT之家','ithome.com','科技资讯'],['V2EX','v2ex.com','技术与创意社区'],['Hacker News','news.ycombinator.com','技术与创业资讯'],['知乎','zhihu.com','知识分享与讨论'],['掘金','juejin.cn','开发技术文章'],['阮一峰的网络日志','ruanyifeng.com','技术周刊与阅读'],['36氪','36kr.com','商业与创业动态']]],
 ['media','影音与生活','♫','#b09162',[
  ['哔哩哔哩','bilibili.com','视频内容与学习'],['YouTube','youtube.com','视频与创作者频道'],['Spotify','open.spotify.com','音乐与播客'],['豆瓣','douban.com','电影、图书与生活'],['小红书','xiaohongshu.com','生活经验与灵感'],['什么值得买','smzdm.com','消费资讯与购物参考']]]
];
export const demoNavigation = {version:1,settings:{brandName:'NavDesk 本地演示'},groups:groups.map(([id,name,icon,color,links],sort)=>({id,name,icon,color,sort,links:links.map(([name,host,description],index)=>({id:`${id}-${index}`,name,url:`https://${host}/`,description,icon:'',openInNew:true,sort:index}))}))};
