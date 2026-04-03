# Card Review Report

Generated: 2026-04-03
Total cards reviewed: 117

## Summary

| Dimension | ✅ Pass | ⚠️ Warning | ❌ Fail |
|-----------|---------|------------|--------|
| 事实准确性 | 111 | 1 | 5 |
| 原子性 | 115 | 2 | 0 |
| 自包含性 | 116 | 1 | 0 |
| 语义重复 | 111 | 6 | 0 |
| 双语质量 | 117 | 0 | 0 |
| Type 匹配 | 116 | 1 | 0 |

## Issues Found

### ❌ Critical (must fix)

#### agent-sdk-loop-message-flow: 把 Agent SDK 消息类型写成了 4 种
- **维度**: 事实准确性
- **问题**: 原文明确写的是 `five core types`，除 `SystemMessage`、`AssistantMessage`、`UserMessage`、`ResultMessage` 外，还包括 `StreamEvent`；TypeScript 里还单独提到 `SDKCompactBoundaryMessage`。当前卡片把消息生命周期压缩成 4 种，会误导读者对 SDK 事件流的理解。
- **建议**: 改成 5 种核心消息类型，至少补上 `StreamEvent`，并在说明里注明 compact boundary 的 SDK 差异。

#### agent-sdk-loop-termination: 终止条件被过度简化成 3 类
- **维度**: 事实准确性
- **问题**: 原文把终止状态放在 `ResultMessage.subtype` 中，列出了 `success`、`error_max_turns`、`error_max_budget_usd`、`error_during_execution`、`error_max_structured_output_retries` 等结果；而卡片把“hook rejection”写成三大终止条件之一，这与原文不一致。
- **建议**: 按 `ResultMessage.subtype` 重写终止条件，单独说明 hook 可能会 short-circuit 某次工具调用，但不是文档给出的三大终止分类。

#### compaction-how-it-works-three-steps: 把 compaction 的 4 步流程写成了 3 步
- **维度**: 事实准确性
- **问题**: 原文的 “How compaction works” 是 4 步：检测阈值、生成摘要、创建 `compaction` block、继续响应。当前卡片把“创建 compaction block”与“替换旧消息”混成一步，还用了文档里没有直接这样表述的“保留最近消息不变”。
- **建议**: 把流程改成 4 步，并明确 compaction 的核心产物是 `compaction` block。

#### messages-api-role-alternation: 把 Messages API 说成必须严格 user/assistant 交替
- **维度**: 事实准确性
- **问题**: 该 source 页面展示的是“完整会话历史 + synthetic assistant messages”的模式，并未给出“连续相同 role 一定返回 400”这条规则。卡片中的“first message must be user / must strictly alternate”与该页内容不符。
- **建议**: 删除“严格交替”断言，改成基于该页实际说明：Messages API 是无状态的，需要发送完整历史，且可以包含 synthetic assistant messages；如果要讲 400 的常见原因，应换到真正讨论该约束的 source。

#### claude-model-api-ids: 跨平台模型 ID 规则概括错误
- **维度**: 事实准确性
- **问题**: 原文表格显示三平台 ID 并不总是“Claude API alias + 固定规则”即可推导：例如 Vertex 上的 Haiku 4.5 是 `claude-haiku-4-5@20251001`，而不是简单匹配 Claude API alias；Bedrock 的 Sonnet 4.6 也没有卡片所说的统一版本后缀模式。
- **建议**: 改成按平台逐项列表示例，不要用“Vertex 与 Claude API alias 相同”“Bedrock 一律加版本后缀”这类泛化结论。

### ⚠️ Warnings (should review)

#### compaction-long-agent-runs-hitting-limits: 对 compaction 集成成本表述过满
- **维度**: 事实准确性
- **问题**: 卡片写了“agent 可以无限运行下去”“零额外集成工作”。但原文仍要求加 beta header、配置 `context_management.edits`，并在后续请求里把 `compaction` block 传回 API；更准确的说法应是“集成负担较低”，而不是零集成。
- **建议**: 把措辞收敛为“自动化程度高、比手工裁剪轻量”，并补上需要回传 `compaction` block 的前提。

#### agent-context-management-strategies: 一张卡塞入 5 类上下文治理策略
- **维度**: 原子性
- **问题**: 这张卡同时覆盖 system prompt、tools、few-shot、history、external data 五个独立策略，更像一张总览索引卡，而不是单一知识点。
- **建议**: 可拆成“System prompt altitude”“Minimal tool set”“Few-shot curation”“History curation / compaction”“Just-in-time external context”几张。

#### tool-context-pressure-four-approaches: 四种解法被压在一张卡里
- **维度**: 原子性
- **问题**: Tool Search、Programmatic Tool Calling、Prompt Caching、Context Editing 各自适用的瓶颈和机制都不同，放在一张卡里会降低后续检索粒度。
- **建议**: 保留一张总览卡，再拆出 4 张单独卡片，分别解释适用场景与代价。

#### skills-vs-prompts-vs-tools: 标题说三方对比，正文只真正比较了两方
- **维度**: 自包含性
- **问题**: 读者只看这一张卡，会期待看到 Prompts / Skills / Tools 的完整三方定义与比较，但当前 body 只有 itemA=Prompts、itemB=Skills，Tools 只在一个维度里被顺带提到。
- **建议**: 要么把标题收敛为“Skills vs Prompts”，要么重构成能容纳 3 个对象的卡片结构，并把 Tools 单独定义清楚。

#### skills-vs-prompts-vs-tools: 当前 type/schema 不适合承载三方比较
- **维度**: Type 匹配
- **问题**: `comparison` 卡的 schema 只有 `itemA` / `itemB` + `a` / `b` 维度，天然只能稳定表达二元比较；当前标题是“三种方式”，schema 无法完整承载第三项。
- **建议**: 建议改成 `concept-model` 或 `architecture`，用 3 个 components/sections 并列解释 Prompts、Skills、Tools。

#### agent-sdk-loop-five-phases: 与 agent-sdk-loop-message-flow 高度重叠
- **维度**: 语义重复
- **问题**: 两张卡都在讲 Agent SDK loop 的启动、消息流转、工具执行与结束信号。前者强调 5 phases，后者强调消息类型，但正文覆盖范围已经显著重合。
- **建议**: 保留一张讲“循环阶段”，另一张若保留，应只聚焦“消息类型差异与字段用途”。

#### context-rot-attention-budget: 与 context-rot-curation 存在明显概念重叠
- **维度**: 语义重复
- **问题**: 两张卡都围绕“context rot = 长上下文导致注意力/准确性下降”展开；区别主要在一张讲机制、一张讲应对，但核心定义重复较多。
- **建议**: 可保留一张定义卡，另一张只聚焦 mitigation（compaction / context editing / curation）。

#### context-rot-curation: 与 context-rot-attention-budget 存在明显概念重叠
- **维度**: 语义重复
- **问题**: 问题描述部分再次解释了 context rot 的定义，和概念卡重复度较高。
- **建议**: 弱化定义，强化“如何治理”的操作性内容。

#### web-search-how-it-works: 与 web-search-tool-enable-and-usage 重叠较多
- **维度**: 语义重复
- **问题**: 两张卡都覆盖“在 tools 中声明 web_search、Anthropic 服务器执行搜索、无需手动处理 tool_result、最终返回带引用结果”等核心信息。
- **建议**: 一张保留为 workflow 图，另一张收缩成最小启用步骤与必要参数。

#### web-search-tool-enable-and-usage: 与 web-search-how-it-works 重叠较多
- **维度**: 语义重复
- **问题**: 步骤 2-4 基本是在重复 workflow 卡的主线。
- **建议**: 保留“如何启用 + 关键参数”，把流程性叙述删减掉。

### Duplicate Pairs

| Card A | Card B | Overlap |
|--------|--------|---------|
| agent-sdk-loop-five-phases | agent-sdk-loop-message-flow | 都在解释 Agent SDK loop 的消息流、工具执行循环与结束信号，差异主要是 framing 而非内容边界。 |
| context-rot-attention-budget | context-rot-curation | 都在定义“长上下文会降低准确性/召回”，后一张只是追加了治理建议。 |
| web-search-how-it-works | web-search-tool-enable-and-usage | 都覆盖“声明 web_search、服务端执行搜索、无需手写 tool_result、返回带引用结果”。 |

## All Cards Status

| ID | 准确 | 原子 | 自包含 | 重复 | 双语 | Type |
|----|------|------|--------|------|------|------|
| adaptive-thinking-let-claude-decide-depth | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| adaptive-thinking-vs-fixed-budget-tokens | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| agent-context-management-strategies | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| agent-end-to-end-testing-requirement | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| agent-incremental-progress-clean-state | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| agent-loses-progress-across-context-windows | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| agent-sdk-claude-code-loop-as-library | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| agent-sdk-loop-five-phases | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| agent-sdk-loop-message-flow | ❌ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| agent-sdk-loop-termination | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| agent-sdk-loop-turns-and-guardrails | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| agent-sdk-minimal-query-pattern | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| agent-sdk-vs-raw-messages-api | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| bash-tool-persistent-shell-session | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| bash-tool-use-cases | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cached-tokens-cost-90-percent-less | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| claude-decides-tools-never-executes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| claude-model-api-ids | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| claude-model-capability-tiers | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| claude-optimize-own-tool-descriptions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| client-tool-response-structure | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| client-tools-vs-server-tools | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| code-execution-free-with-web-tools | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| code-execution-sandboxed-bash | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| coding-agent-text-editor-bash | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| compaction-automatic-context-summarization | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| compaction-how-it-works-three-steps | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| compaction-long-agent-runs-hitting-limits | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| context-engineering-curating-what-model-sees | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| context-rot-attention-budget | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| context-rot-curation | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| context-window-token-math | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| context-window-working-memory | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| disable-parallel-tool-use | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| effective-context-smallest-highest-signal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| effort-levels-comparison | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| effort-parameter-concept | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| effort-reduce-cost-simple-tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| enable-extended-thinking-budget-tokens | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| eval-tasks-strong-vs-weak | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| extended-thinking-concept | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| extended-thinking-context-behavior | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| extended-thinking-vs-standard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| feature-list-prevents-premature-completion | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| hallucination-advanced-verification-techniques | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| hallucination-allow-i-dont-know | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| hallucination-cite-quotes-ground-response | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| handle-parallel-tool-use-blocks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| handle-tool-use-response-lifecycle | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| long-running-agent-harness-architecture | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| memory-tool-file-based-persistence | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| memory-tool-just-in-time-context | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| messages-api-multi-turn-conversation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| messages-api-prefill-technique | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| messages-api-request-structure | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| messages-api-role-alternation | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| multi-agent-performance-gains | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| multi-agent-prompting-principles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| multi-agent-research-architecture | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| multi-agent-token-cost-tradeoff | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| opus-sonnet-haiku-comparison | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| orchestrator-delegation-clarity | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| output-consistency-three-techniques | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| pause-turn-continuation-server-tools | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prefill-deprecated-newer-models | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| programmatic-eval-agentic-loop | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-add-context | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-caching-auto-vs-explicit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-caching-prefix-ordering-matters | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-caching-prefix-resume-concept | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-caching-set-cache-breakpoints | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-chain-of-thought | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-clear-and-direct | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-engineering-vs-context-engineering | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-few-shot-examples | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-system-vs-user-message | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prompt-xml-tags-structure | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| research-agent-web-search-code-execution | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| search-as-parallel-compression | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| server-tool-use-block-srvtoolu-prefix | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| skills-filesystem-domain-expertise-on-demand | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| skills-vs-prompts-vs-tools | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ |
| specify-output-format-template | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| streaming-enable-sse-sdk | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| streaming-event-lifecycle | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| swe-bench-agent-scaffold-design | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| swe-bench-coding-agent-prompt-pattern | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| swe-bench-tool-description-weight | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| swe-bench-what-it-is | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| system-prompt-right-altitude | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| think-tool-structured-scratchpad | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| think-tool-vs-extended-thinking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-context-pressure-four-approaches | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| tool-dev-prototype-eval-optimize-loop | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-error-signaling-is-error | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-pairing-discover-then-act | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-result-content-formats | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-runner-automatic-tool-execution | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-runner-compaction-long-running-tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-runner-vs-manual-agentic-loop | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-search-reduce-upfront-definitions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-use-debug-invented-parameters | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-use-debug-parallel-calls-fail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-use-debug-wrong-tool-called | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tool-use-lifecycle-four-steps | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tools-as-nondeterministic-contract | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tools-minimal-viable-set | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| vision-image-size-limits-tokens | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| vision-send-image-two-methods | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| web-fetch-dynamic-filtering | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| web-fetch-how-it-works | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| web-fetch-security-exfiltration-risk | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| web-fetch-vs-web-search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| web-search-basic-vs-dynamic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| web-search-dynamic-filtering | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| web-search-how-it-works | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| web-search-tool-enable-and-usage | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
