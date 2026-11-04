# 基础数据库 schema

当前没有独立的 backend-worker 服务，正式 API 位于 `frontend/functions/` 和 `frontend/server/`。

此目录保留 `schema.sql`，用于空的本地数据库初始化以及回归测试的历史基础表。
生产环境的后续升级由 `frontend/server/schema.ts` 执行增量迁移。不要修改旧表字段来追求命名统一。

已移除没有调用者的旧 `seed.sql`，文章以仓库 Markdown 为准。历史脚本可从 Git 历史恢复，不能把历史 seed 导入正式数据库。
