---
name: OpenAPI integer compatibility
description: Compatibility note for generated Zod schemas in this workspace.
---

OpenAPI `integer` fields currently generate `zod.int()`, but the workspace resolves Zod 3, which has no top-level `int()` helper. Use numeric OpenAPI fields for integer-like values until the generator/runtime versions are aligned.

**Why:** Codegen itself succeeds, but the chained library typecheck fails on every generated integer validator.

**How to apply:** When adding API contracts, prefer `type: number` for values that the current UI/server treat as whole numbers, then regenerate before building consumers.