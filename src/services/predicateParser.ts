import type {
  ParseResult,
  AutomatonState,
  AutomatonTransition,
  MemoEntry,
} from "../types";
import { analyzeExpressions } from "./stackParser";

interface RawPredicate {
  label: string | null;
  condition: string;
  actions: string; // goto-stripped, ready for model
  gotos: string[]; // label names extracted from goto statements
  sem: string | null; // semaphore name from <sem: resource>
  resource: string | null; // resource subroutine from <sem: resource>
}

function parseLine(line: string): RawPredicate {
  // Optional :label prefix
  const labelMatch = line.match(/^:(\w+)\s+(.*)$/);
  const label = labelMatch ? labelMatch[1] : null;
  const rest = labelMatch ? labelMatch[2] : line;

  const condMatch = rest.match(/\{([^}]*)\}/);
  const actMatch = rest.match(/\[([^\]]*)\]/);
  const memoMatch = rest.match(/<([^:>]+):([^>]+)>/);
  const raw = actMatch ? actMatch[1] : "";

  // Extract all goto targets
  const gotos: string[] = [];
  const gotoRe = /\bgoto\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = gotoRe.exec(raw)) !== null) gotos.push(m[1]);

  // Strip goto statements from actions
  const actions = raw
    .replace(/\bgoto\s+\w+/g, "")
    .split(";")
    .map((a) => a.trim())
    .filter(Boolean)
    .join("; ");

  return {
    label,
    condition: condMatch ? condMatch[1].trim() : "true",
    actions,
    gotos,
    sem: memoMatch ? memoMatch[1].trim() : null,
    resource: memoMatch ? memoMatch[2].trim() : null,
  };
}

export function parsePredicates(text: string): ParseResult {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      model: { states: [], transitions: [], memo: [] },
      exprAnalysis: [],
    };
  }

  const parsed = lines.map(parseLine);
  const n = parsed.length;

  // Build label → stateId map (id = index + 1)
  const labelMap = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    if (parsed[i].label) labelMap.set(parsed[i].label!, i + 1);
  }

  const states: AutomatonState[] = [];
  const transitions: AutomatonTransition[] = [];

  for (let i = 0; i < n; i++) {
    const p = parsed[i];
    const id = i + 1;

    // Final = last state with no goto (no outgoing transitions)
    const type =
      i === 0
        ? "initial"
        : i === n - 1 && p.gotos.length === 0
          ? "final"
          : "normal";

    states.push({ id, type, label: p.label, actions: p.actions, mark: false });

    // Sequential incoming transition from state id-1 → id
    if (i > 0) {
      transitions.push({ from: id - 1, condition: p.condition, to: id });
    }

    // Goto transitions FROM this state, using this state's own condition.
    // The sequential outgoing (to id+1) uses the NEXT predicate's condition,
    // so goto and sequential are naturally complementary when designed correctly.
    for (const target of p.gotos) {
      const toId = labelMap.get(target);
      if (toId !== undefined) {
        transitions.push({ from: id, condition: p.condition, to: toId });
      }
    }
  }

  // Build memo entries from predicates that have <sem: resource>
  const memo: MemoEntry[] = parsed
    .map((p, i) =>
      p.sem && p.resource
        ? { stateId: i + 1, sem: p.sem, resource: p.resource }
        : null,
    )
    .filter((e): e is MemoEntry => e !== null);

  const exprAnalysis = states.flatMap((s) =>
    s.actions ? analyzeExpressions(s.actions) : [],
  );

  return {
    model: { states, transitions, memo },
    exprAnalysis,
  };
}
