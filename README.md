# gushui8

基于 Express 的 Node.js Web 应用，集成 RBAC 权限管理、CSRF 防护、SQLite 数据库和模块化架构。

## 技术栈

- **运行时**: Node.js
- **Web 框架**: Express 5
- **模板引擎**: Pug
- **ORM**: Sequelize（SQLite）
- **会话管理**: express-session + connect-sqlite3
- **安全防护**: 自定义 CSRF 令牌 + 安全响应头
- **环境变量**: dotenv

## 环境要求

- Node.js 16.14.2+
- npm 9.6.12+

## 项目结构

```
gushui8/
├── app.js                  # 应用入口，中间件与路由注册
├── service.js              # 启动脚本，数据库初始化与服务监听
├── package.json
├── .env                    # 环境变量（不提交）
├── .env.example            # 环境变量示例
├── .gitignore
├── public/                 # 静态资源
├── shared/                 
│   ├── views/              # 全局 Pug 模板
│   └── ...
├── src/                    # 源码配置
│   ├── config/             # 安全与应用配置
│   ├── shared/             # 共享模块与视图
│   |   |── database/       # Sequelize 模型
│   |   └── views/          # 全局 Pug 模板
│   └── ...
├── features/               # 功能模块（各自包含 routes / views / models）
│   └── modules/               # 功能模块（各自包含 routes / views / models）
```

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 按需编辑 .env 中的端口、密钥等

# 3. 启动服务
npm start
```

启动后访问：`http://localhost:3000`（默认端口，取决于 `.env` 配置）

### 本地 HTTPS 开发

设置环境变量 `HTTPS_ENABLED=true`，并准备好 TLS 证书文件（key + cert）后，服务将额外监听 HTTPS 端口。

## 功能特性

- **RBAC 权限管理** — 基于角色与权限的访问控制，支持 `hasRole` / `can` 检查
- **CSRF 防护** — 自动生成并验证 CSRF 令牌，覆盖 POST/PUT/DELETE 等写请求
- **会话持久化** — 基于 SQLite 的 session 存储，避免重启丢失
- **Flash 消息** — 通过 `req.flash` / `res.locals` 传递一次性提示
- **模块化路由** — `features/` 目录下每个模块独立管理自己的路由和视图
- **安全响应头** — 自定义 security headers（如 X-Content-Type-Options、X-Frame-Options 等）
- **数据库自动同步** — 首次运行自动建表，缺失 RBAC 表时自动补齐
- **HTTPS 可选** — 开发环境支持本地 TLS 证书

## 安全说明

项目通过 `src/config/security` 集中管理安全配置，包括：

- Session 密钥与 Cookie 策略
- CSRF 令牌长度、来源字段与安全方法白名单
- 全局安全响应头
- 公开路径与未授权错误响应

## NPM 脚本

| 命令 | 说明 |
|------|------|
| `npm start` | 启动服务（运行 `service.js`） |

## 相关链接

- [Express 官方文档](https://expressjs.com/)
- [Sequelize 文档](https://sequelize.org/)
- 仓库地址: https://github.com/linggano/gushui8