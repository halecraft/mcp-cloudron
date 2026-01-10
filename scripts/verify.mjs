import { spawn } from "node:child_process"

const args = new Set(process.argv.slice(2))

const jsonMode = args.has("--json")

let logsMode = "failed"

if (args.has("--logs=all")) logsMode = "all"
if (args.has("--logs=none")) logsMode = "none"

/**
 * Color policy:
 * - Only colorize when writing to a TTY
 * - Respect NO_COLOR
 * - Disable in --json mode (stdout must be clean JSON)
 */
const isTTY = process.stdout.isTTY && !jsonMode
const colorEnabled =
  isTTY && !("NO_COLOR" in process.env) && process.env.TERM !== "dumb"

const ansi = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  cyan: "\u001b[36m",
  bold: "\u001b[1m",
}

const c = (code, s) => (colorEnabled ? `${code}${s}${ansi.reset}` : s)
const okMark = () => (colorEnabled ? c(ansi.green, "✓") : "OK")
const failMark = () => (colorEnabled ? c(ansi.red, "✗") : "FAIL")
const arrow = () => (colorEnabled ? c(ansi.cyan, "→") : "->")

function writeHuman(line) {
  // In --json mode, keep stdout JSON-only; send human output to stderr.
  const stream = jsonMode ? process.stderr : process.stdout
  stream.write(line)
}

/**
 * Summarizers (task-level)
 */
function summarizeDefault(r) {
  const label = r.ok ? r.successLabel : r.failureLabel
  return `${r.key}: ${label}`
}

function summarizeJest(r) {
  const out = r.output ?? ""

  // Match Jest output: "Tests:       17 passed, 17 total"
  const tests = out.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/m)

  // Match: "Time:        1.234 s"
  const duration = out.match(/Time:\s+([\d.]+\s*m?s)/m)

  if (!tests || !duration) return null

  const passed = tests[1]
  const total = tests[2]
  const dur = duration[1]

  return `${r.key}: ${r.successLabel} (${passed}/${total} tests passed in ${dur})`
}

/**
 * Tasks
 *
 * Note: key is a stable identifier. If you want prettier names, add a `name` field.
 * For now, we keep `key` as your script name so it's clear what's running.
 */
const tasks = [
  {
    key: "verify:format",
    cmd: ["pnpm", ["verify:format"]],
    successLabel: "All formatting is correct",
    failureLabel: "Formatting issues found",
    summarize: summarizeDefault,
  },
  {
    key: "verify:logic",
    cmd: ["pnpm", ["verify:logic"]],
    successLabel: "All tests passed",
    failureLabel: "Tests failed",
    summarize: r => summarizeJest(r) ?? summarizeDefault(r),
  },
  {
    key: "verify:types",
    cmd: ["pnpm", ["verify:types"]],
    successLabel: "All types are correct",
    failureLabel: "Type errors detected",
    summarize: summarizeDefault,
  },
]

function runTask(task) {
  const start = Date.now()

  // Immediate feedback so it never looks hung.
  writeHuman(`${arrow()} starting ${c(ansi.bold, task.key)}\n`)

  return new Promise(resolve => {
    const [bin, cmdArgs] = task.cmd
    const p = spawn(bin, cmdArgs, {
      shell: process.platform === "win32",
      env: { ...process.env, NO_COLOR: "1" },
    })

    let output = ""

    p.stdout.on("data", d => {
      output += d.toString()
    })

    p.stderr.on("data", d => {
      output += d.toString()
    })

    p.on("close", code => {
      const durationMs = Date.now() - start
      const exitCode = code ?? 1
      const ok = exitCode === 0

      // Base result (no functions inside)
      const result = {
        key: task.key,
        cmd: task.cmd,
        ok,
        code: exitCode,
        durationMs,
        output,
        successLabel: task.successLabel,
        failureLabel: task.failureLabel,
      }

      // Task-specific summary (optional); fall back to labels
      const summaryLine =
        typeof task.summarize === "function"
          ? (task.summarize(result) ?? summarizeDefault(result))
          : summarizeDefault(result)

      // Optional "finished" marker (still minimal output)
      writeHuman(
        `${ok ? okMark() : failMark()} finished ${c(ansi.bold, task.key)} ${c(
          ansi.dim,
          `(${durationMs}ms)`,
        )}\n`,
      )

      resolve({
        ...result,
        summaryLine,
      })
    })
  })
}

const startedAt = new Date().toISOString()
const wallStart = Date.now()

const results = await Promise.all(tasks.map(runTask))

const finishedAt = new Date().toISOString()
const durationMs = Date.now() - wallStart

const allOk = results.every(r => r.ok)

if (logsMode !== "none") {
  for (const r of results) {
    if (logsMode === "failed" && r.ok) continue

    writeHuman(
      `\n${c(ansi.bold, "====")} ${c(ansi.bold, r.key.toUpperCase())} ${
        r.ok ? c(ansi.green, "OK") : c(ansi.red, "FAIL")
      } ${c(ansi.bold, "====")}\n`,
    )

    writeHuman(r.output || "(no output)\n")
  }
}

if (jsonMode) {
  // Machine-parseable, stable, no ANSI, stdout only.
  const summary = {
    ok: allOk,
    startedAt,
    finishedAt,
    durationMs,
    tasks: results.map(r => ({
      key: r.key,
      ok: r.ok,
      code: r.code,
      durationMs: r.durationMs,
      summaryLine: r.summaryLine,
    })),
  }

  process.stdout.write(`${JSON.stringify(summary)}\n`)
  process.exit(allOk ? 0 : 1)
}

/* ---------- HUMAN SUMMARY (ALWAYS LAST) ---------- */

writeHuman("\n")
for (const r of results) {
  const line = r.ok ? c(ansi.green, r.summaryLine) : c(ansi.red, r.summaryLine)
  writeHuman(`${line}\n`)
}

writeHuman(
  `${allOk ? c(ansi.green, "\n== verification: All correct ==") : c(ansi.red, "\n== verification: Failed ==")}\n`,
)

process.exit(allOk ? 0 : 1)
