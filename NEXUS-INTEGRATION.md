# Nexus 接入

本目录为独立的本地实现副本，没有更改线上博客，也没有修改之前的博客工作目录。

博客导航入口暂不加入；仅保留接入代码供功能完善后使用。未来入口可指向 `https://nexus.mavicer.cc/api/auth/blog/start?next=/&prompt=none`。已登录时同步身份，匿名时返回 Nexus 公开目录。登录页支持完成认证后跳回授权接口。

Cloudflare Pages 的服务端环境变量：

- `NEXUS_ORIGIN=https://nexus.mavicer.cc`
- `NEXUS_SSO_SECRET`：至少 32 字节的随机密钥，与 Nexus 的 `BLOG_SSO_SECRET` 相同。

保留现有 `DB` 绑定。SSO 表由现有请求入口进行增量初始化，不变更用户密码、原始博客会话 Cookie、文章和收藏表。授权码 60 秒有效且单次使用，绑定固定回调和 S256 PKCE；身份令牌仅保存哈希，通过父博客会话判断有效性。退出和密码重置沿用原有会话撤销机制。

新增接口位于 `frontend/server/nexus-sso.ts`。定向测试：在 frontend 内运行 `node --test tests/nexus-sso.test.mjs`。已通过授权码防重放、PKCE、客户端认证、回调限制、两站退出及密码重置后的会话校验；已通过前后端类型检查。

正式发布顺序：先准备 Nexus 的运行环境及 HTTPS 域名，再配置两端服务端密钥并发布博客接口，最后在 Nexus 设置 `AUTH_PROVIDER=blog`。当前 Nexus 仍为本地 Next.js + PostgreSQL，尚未完成 Cloudflare Workers 运行适配、生产数据库接入或 DNS 配置，不能把本地实现完成称为已经上线。发布前应将此补丁应用到博客最新 main，并处理可能出现的并行修改。
