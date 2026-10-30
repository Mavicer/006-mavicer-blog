# 公告与新功能红点

首页公告使用 Nexus 首页截图，当前浏览器只自动显示一次。支持关闭和 Esc；存储不可用时不自动弹出。

右侧工具栏折叠时提示未读，展开后在对应功能上显示红点。进入功能才标记已读，刷新后不再显示；多标签页通过storage同步，不宣称跨设备同步。每个发布ID从其配置发布日期起显示120小时，到期自动消失，不按首次访问重新计时。

`src/services/featureReleases.ts` 登记功能ID与实际发布日期。个性化当前按2026-10-27北京时间零点配置，五天后消失；后续功能使用独立ID。

正式发布配置保存在 `.env.production`：

```dotenv
VITE_NEXUS_ANNOUNCEMENT=1
VITE_NEXUS_LAUNCHED=1
VITE_NEXUS_URL=https://nexus.mavicer.cc/api/auth/blog/start?next=/&prompt=none
```

本地.env.local仅开启公告预览并跳到本机3040，不进入Git。Nexus上线后开启LAUNCHED，顶部与手机菜单移除「分类」入口，并把 Nexus 放在末尾；侧栏分类和分类页面保留。SSO不由这些开关自动启用。

已完成4项定向规则测试、前端类型检查和浏览器验证：公告关闭后刷新不再弹出；个性化红点在进入功能后刷新不再显示。未重复执行全量业务测试。


Nexus 公告现使用用户提供的首页截图 `/media/nexus-home.jpg`，替代演示视频与播放控件；一次性展示键仍为 `MAVICER_NEXUS_ANNOUNCEMENT_V1`。
