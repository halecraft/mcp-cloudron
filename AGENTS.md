# NPM Packages:

- This project uses pnpm for package management and running scripts.
- To find node_modules code, you'll usually find it in node_modules/.pnpm. For example: `find node_modules/.pnpm -name "*.d.ts" -path "*loro-crdt*" -exec grep -l "UndoManager" {} \; 2>/dev/null`

# Verification & Tests

- After generating or changing code, you can verify formatting, logic (via tests), and type correctness with `pnpm verify`.
- You can also check any specific subset of the verification:
  - `pnpm verify:format`: verify just the formatting & lint rules
  - `pnpm verify:logic`: verify business logic via unit and integration tests
  - `pnpm verify:types`: verify correctness of typescript types

# Best practices:

1. For exploratory debugging, create a .test.ts file rather than a .js or .mjs file, as it will integrate with typescript.
2. When fixing a bug, it's important to write a test that replicates the problem, and that you run the test to prove it fails. Then fix the bug, run the test, and prove it works.
3. Instead of deleting markdown files used for planning, assessing, todos, etc. stash them (even if they are gitignored). For example, instead of `rm packages/repo/src/fix.md`, use `git add -f packages/repo/src/fix.md && git stash push -m "fix plan" packages/repo/src/fix.md`.
4. This is an INTERNAL project. No production code. No deprecation is needed. No backwards compatibility is needed when changing files.
5. New plans go in the .plans/ dir.

# Typescript rules:

- work with and use typescript
- non-null assertions are forbidden (use if/throw instead)
- casting `as unknown as` is forbidden
