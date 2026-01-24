---
name: qa-agent-source-ids
overview: 把 source_ids 贯通到 QA 对话，系统消息展示来源标题/简介，并在来源变更时插入 user_message 更新上下文。
todos:
  - id: api-client-source-ids
    content: Replace selectedDocumentIds with source_ids in API/client
    status: completed
  - id: source-repo-by-ids
    content: Add SourceRepo listSourcesByIds and Supabase impl
    status: completed
  - id: qa-agent-source-context
    content: Inject source titles/descriptions into systemMessage
    status: completed
  - id: qa-agent-source-update
    content: Insert user_message when source_ids change
    status: completed
  - id: lint-check
    content: Run lint if needed after edits
    status: completed
isProject: false
---

# QA Agent Source Context Plan

## 目标

- 对话接口支持 `source_ids`（替换 `selectedDocumentIds`）并传到检索过滤。
- `qaAgent` 根据 `source_ids` 拉取来源标题/简介，拼接进 `systemMessage`。
- 会话中 `source_ids` 变化时，插入一条 `user_message` 来更新来源上下文。

## 关键改动点

- API + 客户端请求体字段替换为 `source_ids`：
  - [`/Users/jychen/Work/mem-write/src/app/api/agent/qa/chat/route.ts`](/Users/jychen/Work/mem-write/src/app/api/agent/qa/chat/route.ts)
  - [`/Users/jychen/Work/mem-write/src/client/agent/qaClient.ts`](/Users/jychen/Work/mem-write/src/client/agent/qaClient.ts)
  - [`/Users/jychen/Work/mem-write/src/app/project/[project_id]/page.tsx`](/Users/jychen/Work/mem-write/src/app/project/%5Bproject_id%5D/page.tsx)
- 来源拉取与系统消息拼接：
  - [`/Users/jychen/Work/mem-write/src/server/domain/agent/qaAgent.ts`](/Users/jychen/Work/mem-write/src/server/domain/agent/qaAgent.ts)
- SourceRepo 新增按 ids 查询：
  - [`/Users/jychen/Work/mem-write/src/server/repo/sourceRepo.ts`](/Users/jychen/Work/mem-write/src/server/repo/sourceRepo.ts)
  - [`/Users/jychen/Work/mem-write/src/server/infra/supabaseSourceRepo.ts`](/Users/jychen/Work/mem-write/src/server/infra/supabaseSourceRepo.ts)

## 设计要点

- `systemMessage` 构造位置在 `qaAgent` 中：
```162:168:/Users/jychen/Work/mem-write/src/server/domain/agent/qaAgent.ts
const systemMessage = new SystemMessage(
    [
        'You are a MemWrite QA agent.',
        'Use tools to retrieve knowledge when helpful.',
        'Answer in Chinese unless the user explicitly requests another language.',
    ].join(' '),
);
```

- 当 `filters.sourceIds` 存在时：
  - 从 `SourceRepo` 获取来源记录（限定 `project_id` + `id in (...)`）。
  - 组装中文概述（标题 + 简介）并附加到 `systemMessage`。
- 追踪来源变化：
  - 解析历史消息，查找带特定标记的 `user_message`（例如 `[[sources:update]]`）并提取最近的 `source_ids`。
  - 若当前 `source_ids` 与最近记录不同，则在本次输入前插入一条 `HumanMessage`，文本模板我将采用简洁中文格式（例如“已更新来源：标题…（含简介）”），并包含可解析的 `source_ids` 以便后续比对。

## 实施步骤

1. **接口字段替换**

   - 将请求体中的 `selectedDocumentIds` 替换为 `source_ids`，同步更新校验与 `filters.sourceIds` 赋值。
   - 更新前端请求体与类型定义，确保 `source_ids` 从 `selectedSourceIds` 传递。

2. **SourceRepo 扩展**

   - 增加 `listSourcesByIds(projectId, sourceIds)` 方法。
   - Supabase REST 查询中加入 `project_id=eq.<id>` 与 `id=in.(...)` 并只取必要字段（`id,title,description` 等）。

3. **qaAgent 系统消息注入**

   - 当 `source_ids` 非空时，拉取来源，构建来源概述字符串并追加到 `systemMessage`。
   - 处理缺失简介或标题为空的情况（降级为 `filename`/`source_url` 或 `id`）。

4. **来源变更插入 user_message**

   - 从历史消息中读取最近一次来源更新的 `source_ids`。
   - 若变更，先插入一条 `HumanMessage`（模板 + 可解析 `source_ids`），再插入用户真实提问。

5. **校验与回归**

   - 确认仍能正常检索与流式聊天。
   - 若需要，运行 `npm run lint` 检查相关文件。

## 备注

- `source_ids` 将完全替换 `selectedDocumentIds`（按你的指示）。
- user_message 更新模板采用简洁中文，包含可解析标记用于后续比较。