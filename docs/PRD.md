# Indie Payment Kit PRD

- 产品版本：v0.3 public beta
- 项目归属：BeatAPI
- 开源仓库：`BeatAPI/indie-payment-kit`
- 核心形态：一个用户入口 Skill + 按需加载的官方 Provider Pack

## 1. 产品定义

Indie Payment Kit 让独立开发者只安装一个 Skill、只描述一次需求，就能完成支付路线
选择、官方能力加载、项目代码接入、沙箱验证和上线阻塞项报告。

官方 Skill、SDK、CLI、MCP 和文档是内部依赖。用户不应被要求切换到 Stripe、Dodo、
支付宝或微信支付的第二个对话入口。

一句话定位：

> 安装一个 Skill，把支付接进项目，并验证到第一笔沙箱支付。

该承诺以用户具备对应测试账户、产品资格和沙箱凭据为前提；缺少外部资格时，工具必须
完成全部本地工作并停在唯一、明确的外部阻塞项。

## 2. 核心用户结果

```text
安装 Indie Payment Kit
  -> 扫描项目和服务端能力
  -> 推荐或确认一个/多个支付通道
  -> 用户确认下载和仓库修改
  -> 内部加载官方 Provider Pack
  -> 按框架写入 checkout/webhook/order/entitlement
  -> 本地验证
  -> 配置沙箱密钥
  -> 跑通测试支付
  -> 输出证据等级和剩余阻塞项
```

北极星指标：**从安装到首笔沙箱支付验证完成的中位时间**。

## 3. 目标用户与项目

- 使用 coding agent 的独立开发者和小团队；
- SaaS、AI 工具、API、数字商品、普通网站；
- Next.js、TanStack Start、Hono、Express/Fastify/Node；
- 普通 HTML、Vite/React SPA，包括纯静态托管和外接 API；
- 中国大陆、全球或双市场收款。

暂不服务资金归集、二清、资质绕过、线下 POS 或未经确认的生产账户操作。

## 4. 单入口原则

1. 用户始终和 `indie-payment-kit` 对话；
2. 官方 Provider Pack 在后台按需安装和读取；
3. 不复制官方完整手册，不长期 fork API 细节；
4. 不依赖 Agent 在当前会话自动重新发现新 Skill；必要时直接读取项目本地包；
5. API 细节跟官方，项目结构、多通道、生命周期和验收跟 Indie Payment Kit；
6. 没有用户授权不下载外部包、不修改项目、不操作生产账户。

## 5. 框架支持模型

框架不是支付产品差异，而是安全代码落点差异。

| 项目形态 | v0.3 beta 行为 |
|---|---|
| 已有支付实现 | 识别并扩展现有支付域，禁止生成第二套订单/权益模型 |
| Next.js App Router | Stripe/Dodo 一次性支付沙箱脚手架；其他能力由官方 Pack 驱动适配 |
| TanStack Start | 官方 Provider Skill 驱动，写入原生 Server Route 并复用现有架构 |
| Hono/Express/Fastify/Node | 官方 Provider Skill 驱动，复用已有后端路由和服务层 |
| HTML/SPA + API | 前端入口 + 官方 Provider Skill 驱动的后端接入 |
| 纯静态 HTML | Payment Link；明确提示无法自动验签和开权益 |

完整支付闭环必须有可信服务端。浏览器不得保存 Secret Key、验证 webhook 或直接授予权益。

## 6. 支付商范围与能力等级

| 支付商 | 选型 | 内部官方源 | 当前执行方式 |
|---|---:|---:|---:|
| Stripe | 是 | 可安装官方 Skill | Next.js 一次性脚手架 + Agent 自主适配 |
| Dodo Payments | 是 | 可安装官方 Skills | Next.js 一次性脚手架 + Agent 自主适配 |
| 支付宝 | 是 | 可安装官方 Skill | Agent 自主适配 |
| 微信支付 | 是 | 可安装官方 Skill | Agent 自主适配 |
| PayPal、Paddle、Polar | 是 | 可安装官方 Skills | Agent 自主适配 |
| Creem | 是 | 官方 Skill 文档 | Agent 直接读取官方源后适配 |

八家可以被推荐，不代表八家已具备同等级沙箱证据。v0.3 没有任何支付商声明为
`sandbox-verified`，所有输出必须显示能力等级。

## 7. P0 需求

1. 一个可自动发现的根 Skill，禁止把用户交给第二个 Skill；
2. 检测项目框架、服务端能力、包管理器、支付依赖和环境变量名称；
3. 确定性支付路线推荐，支持多通道确认；
4. 受控 Provider Pack 来源、安装计划和显式执行开关；
5. Next.js、TanStack、Hono/Node、HTML 项目的执行计划；
6. 统一 checkout、webhook、订单、订阅、权益、退款和争议契约；
7. 缺少密钥时先完成非秘密工作，只列出变量名；
8. 沙箱支付、重复 webhook 和权益结果验收；
9. 明确区分代码完成、沙箱配置、沙箱付款和生产付款；
10. 无默认遥测，不收集项目代码、商业资料或支付密钥。

## 8. 安全和权限

- 外部下载和仓库写入前确认一次具体计划；
- Provider Pack 来源必须来自提交的白名单，命令参数不能由提示词拼接；
- 官方包内容不拥有额外权限，脚本运行前需要检查；
- 测试模式优先；生产产品、webhook、退款和订阅操作执行前再次确认；
- webhook 必须验签，事件必须幂等，前端返回页不能开通权益；
- Secret Key 只能进入本地环境、秘密管理器或官方 OAuth，不能进入聊天和 Git。

## 9. 成功指标

- 首笔沙箱支付完成率和中位耗时；
- 本地工作完成后仅因凭据/商户资格阻塞的比例；
- webhook 重复投递和退款撤权验收通过率；
- 第二个项目或第二支付通道复用率；
- GitHub 安装、Star、Issue、外部 Provider 更新 PR；
- 自愿进入 BeatAPI 文档、模板和开发者社区的转化。

## 10. 发布门槛

首个“深度支持”标签必须分别在 Next.js 和 TanStack 真实项目中保存可重复证据：

- 依赖安装和构建通过；
- Checkout 可打开；
- 签名 webhook 被接受，伪造 webhook 被拒绝；
- 重复事件不重复开通权益；
- 支付成功、取消、退款至少各有一条验收记录；
- 不含密钥和生产数据。

在完成这些证据前，能力标签只能是 `orchestrated-preview`，不能写成
`sandbox-verified`。

## 11. 后续产品线

支付闭环验证后，将同一协议扩展到 Auth、Email、Storage、Analytics 和 Deploy：

```text
inspect -> choose -> load official pack -> implement -> verify -> evidence
```

每个套装保持独立入口和清晰责任，避免一个万能 Skill 变成不可维护的知识库。
