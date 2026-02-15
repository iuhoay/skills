# iuhoay/skills 仓库说明

这个仓库是一个名为 `iuhoay/skills` 的 Claude Code 技能集合，专门用于 Ruby on Rails 开发。

## 核心内容

目前，它主要包含一个名为 `Vanilla Rails` 的技能包。这个技能包的设计理念基于 37signals/Basecamp 的开发哲学（也称为“原味 Rails”），旨在帮助开发者编写更简洁、更符合 Rails 传统的代码。

## 主要功能

安装此技能后，你可以在 Claude Code 中使用以下命令来辅助开发：

*   `/vanilla:review`：审查代码变更，检查是否存在过度设计（over-engineering）。
*   `/vanilla:analyze`：分析现有的代码库，寻找简化的机会。
*   `/vanilla:simplify [目标]`：制定逐步简化代码的计划。

## 开发哲学

该技能强调以下原则：

*   **瘦控制器 (Thin Controllers)**：控制器应保持简单，仅负责处理 HTTP 请求。
*   **充血模型 (Rich Domain Models)**：业务逻辑主要放在 Active Record 模型中。
*   **避免服务层 (No Service Layers)**：除非有充分理由，否则不使用服务对象（Service Objects）。
*   **原生 Active Record (Plain Active Record)**：通常不需要额外的抽象层。
*   **状态管理**：使用专门的模型来管理状态，而不是简单的布尔值。
*   **关注点分离**：通过 Concerns 来组合行为。
*   **核心思想**：“Vanilla Rails is plenty”（原味 Rails 就足够了 —— DHH）。

## 架构结构

这是一个 monorepo（单一代码库），可以容纳多个技能。

*   根目录下的 `marketplace.json` 定义了整个插件集合。
*   每个技能（如 `vanilla-rails/`）都有自己的目录，包含：
    *   `agents/`：定义任务代理。
    *   `commands/`：定义斜杠命令。
    *   `skills/`：定义技能触发器和逻辑。
    *   `plugin.json`：技能的元数据。

简而言之，这是一个让 AI 助手 (Claude Code) 能够以更传统、更精简的 Rails 风格（"The Rails Way"）来辅助你编程的工具集。
