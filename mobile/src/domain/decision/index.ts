/** Internal decision-v2 rules. Never send ballot matrices to a public client. */
export const POLICY_VERSION = "decision-v2" as const;
export const ENGINE_CONTRACT_VERSION = "1.0.0" as const;

export type RoundOneVote = "WANT" | "OK" | "NO";
export type RoundTwoVote = "KEEP" | "REMOVE";
export type MatchTier = "PERFECT" | "CONSENSUS" | "COMPROMISE" | "NO_CONSENSUS";
export type Ballots<Vote extends string> = Readonly<
  Record<string, Readonly<Partial<Record<string, Vote | "UNSET">>> | undefined>
>;

type LockedInput = {
  readonly policyVersion: typeof POLICY_VERSION;
  readonly roster: readonly string[];
  readonly pool: readonly string[];
  readonly round1: Ballots<RoundOneVote>;
};

export type DecisionInput = LockedInput & (
  | { readonly round: 1; readonly round2?: never }
  | { readonly round: 2; readonly round2?: Ballots<RoundTwoVote> }
);

export type ValidationIssue = {
  readonly code: "INVALID_INPUT" | "NOT_MEMBER" | "INVALID_DISH";
  /** JSON Pointer; internal only. Contains no vote value. */
  readonly path: string;
};

type ResultBase = {
  readonly policyVersion: typeof POLICY_VERSION;
  readonly candidateIds: readonly string[];
};

export type DecisionEvaluation = ResultBase & (
  | { readonly status: "INVALID_INPUT"; readonly issues: readonly ValidationIssue[] }
  | { readonly status: "WAITING"; readonly waitingRound: 1 | 2;
      readonly reasonCode: "INCOMPLETE_BALLOT" }
  | { readonly status: "ROUND_2" }
  | { readonly status: "DECISION_READY";
      readonly reasonCode: "UNANIMOUS_WANT" | "ACCEPTABLE_FINAL";
      readonly matchTier: Exclude<MatchTier, "NO_CONSENSUS"> }
  | { readonly status: "NO_CONSENSUS";
      readonly reasonCode: "EMPTY_INTERSECTION" | "ALL_REMOVED";
      readonly matchTier: "NO_CONSENSUS" }
);

type UnknownRecord = Record<string, unknown>;
const own = (value: object, key: string): boolean => Object.hasOwn(value, key);
const pointer = (key: string): string => key.replace(/~/g, "~0").replace(/\//g, "~1");

function isRecord(value: unknown): value is UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0
    && Array.from(value).every(id => typeof id === "string" && id.trim().length > 0)
    && new Set(value).size === value.length;
}

function invalid(issues: ValidationIssue[]): DecisionEvaluation {
  issues.sort((a, b) => {
    if (a.path !== b.path) return a.path < b.path ? -1 : 1;
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
  return { policyVersion: POLICY_VERSION, status: "INVALID_INPUT", candidateIds: [], issues };
}

function validateMatrix(
  value: unknown,
  roster: ReadonlySet<string>,
  pool: ReadonlySet<string>,
  allowed: readonly string[],
  path: string,
): ValidationIssue[] {
  if (!isRecord(value)) return [{ code: "INVALID_INPUT", path }];
  const issues: ValidationIssue[] = [];
  for (const member of Object.keys(value)) {
    const memberPath = `${path}/${pointer(member)}`;
    if (!roster.has(member)) issues.push({ code: "NOT_MEMBER", path: memberPath });
    const ballot = value[member];
    if (!isRecord(ballot)) {
      issues.push({ code: "INVALID_INPUT", path: memberPath });
      continue;
    }
    for (const dish of Object.keys(ballot)) {
      const dishPath = `${memberPath}/${pointer(dish)}`;
      if (!pool.has(dish)) issues.push({ code: "INVALID_DISH", path: dishPath });
      if (typeof ballot[dish] !== "string" || !allowed.includes(ballot[dish] as string)) {
        issues.push({ code: "INVALID_INPUT", path: dishPath });
      }
    }
  }
  return issues;
}

function complete(matrix: UnknownRecord, roster: readonly string[], pool: readonly string[]): boolean {
  return roster.every(member => {
    if (!own(matrix, member)) return false;
    const ballot = matrix[member] as UnknownRecord;
    return pool.every(dish => own(ballot, dish) && ballot[dish] !== "UNSET");
  });
}

function vote(matrix: UnknownRecord, member: string, dish: string): unknown {
  return (matrix[member] as UnknownRecord)[dish];
}

/** Pure tally only. Caller must exclude NO/REMOVE before considering the score. */
export function scoreVotes(want: number, ok: number): number {
  if (!Number.isSafeInteger(want) || !Number.isSafeInteger(ok) || want < 0 || ok < 0
    || !Number.isSafeInteger(2 * want + ok)) {
    throw new RangeError("Counts must be non-negative safe integers with a safe score");
  }
  return 2 * want + ok;
}

/** eligible=false represents veto/no consensus, irrespective of the WANT count. */
export function classifyTier(n: number, want: number, eligible: boolean): MatchTier {
  if (!Number.isSafeInteger(n) || n <= 0 || !Number.isSafeInteger(want)
    || want < 0 || want > n || typeof eligible !== "boolean") {
    throw new RangeError("Invalid roster size, WANT count or eligibility");
  }
  if (!eligible) return "NO_CONSENSUS";
  if (want === n) return "PERFECT";
  return want > n / 2 ? "CONSENSUS" : "COMPROMISE";
}

/**
 * Evaluate an explicit locked snapshot, not a client submission or persisted room.
 * DECISION_READY carries a private tie set; the server selects/persists once.
 * Authentication, submission ACKs, immutable terminals and retries belong to RPC.
 */
export function evaluateDecision(value: unknown): DecisionEvaluation {
  if (!isRecord(value)) return invalid([{ code: "INVALID_INPUT", path: "" }]);
  const issues: ValidationIssue[] = [];
  for (const key of Object.keys(value)) {
    if (!["policyVersion", "roster", "pool", "round", "round1", "round2"].includes(key)) {
      issues.push({ code: "INVALID_INPUT", path: `/${pointer(key)}` });
    }
  }
  if (!own(value, "policyVersion") || value.policyVersion !== POLICY_VERSION) {
    issues.push({ code: "INVALID_INPUT", path: "/policyVersion" });
  }
  if (!own(value, "round") || (value.round !== 1 && value.round !== 2)) {
    issues.push({ code: "INVALID_INPUT", path: "/round" });
  }
  if (!own(value, "roster") || !validIds(value.roster)) {
    issues.push({ code: "INVALID_INPUT", path: "/roster" });
  }
  if (!own(value, "pool") || !validIds(value.pool)) {
    issues.push({ code: "INVALID_INPUT", path: "/pool" });
  }
  if (issues.length > 0) return invalid(issues);

  const roster = value.roster as string[];
  const pool = [...(value.pool as string[])].sort();
  const rosterSet = new Set(roster);
  const poolSet = new Set(pool);
  if (!own(value, "round1")) issues.push({ code: "INVALID_INPUT", path: "/round1" });
  else issues.push(...validateMatrix(value.round1, rosterSet, poolSet,
    ["WANT", "OK", "NO", "UNSET"], "/round1"));
  if (own(value, "round2")) {
    if (value.round !== 2) issues.push({ code: "INVALID_INPUT", path: "/round2" });
    issues.push(...validateMatrix(value.round2, rosterSet, poolSet,
      ["KEEP", "REMOVE", "UNSET"], "/round2"));
  }
  if (issues.length > 0) return invalid(issues);

  const round1 = value.round1 as UnknownRecord;
  const base = { policyVersion: POLICY_VERSION };
  if (!complete(round1, roster, pool)) {
    return { ...base, status: "WAITING", candidateIds: [], waitingRound: 1,
      reasonCode: "INCOMPLETE_BALLOT" };
  }
  const unanimous = pool.filter(dish => roster.every(member => vote(round1, member, dish) === "WANT"));
  const acceptable = pool.filter(dish => roster.every(member => vote(round1, member, dish) !== "NO"));

  // Round 2 only exists after a complete non-unanimous, non-empty round 1.
  if (value.round === 2 && (unanimous.length > 0 || acceptable.length === 0)) {
    return invalid([{ code: "INVALID_INPUT", path: "/round" }]);
  }
  if (unanimous.length > 0) {
    return { ...base, status: "DECISION_READY", candidateIds: unanimous,
      reasonCode: "UNANIMOUS_WANT", matchTier: "PERFECT" };
  }
  if (acceptable.length === 0) {
    return { ...base, status: "NO_CONSENSUS", candidateIds: [],
      reasonCode: "EMPTY_INTERSECTION", matchTier: "NO_CONSENSUS" };
  }
  if (value.round === 1) return { ...base, status: "ROUND_2", candidateIds: acceptable };

  const round2: UnknownRecord = own(value, "round2") ? value.round2 as UnknownRecord : {};
  const scopedIssues = validateMatrix(round2, rosterSet, new Set(acceptable),
    ["KEEP", "REMOVE", "UNSET"], "/round2");
  if (scopedIssues.length > 0) return invalid(scopedIssues);
  if (!complete(round2, roster, acceptable)) {
    return { ...base, status: "WAITING", candidateIds: [], waitingRound: 2,
      reasonCode: "INCOMPLETE_BALLOT" };
  }
  const survivors = acceptable.filter(dish => roster.every(member => vote(round2, member, dish) === "KEEP"));
  if (survivors.length === 0) {
    return { ...base, status: "NO_CONSENSUS", candidateIds: [],
      reasonCode: "ALL_REMOVED", matchTier: "NO_CONSENSUS" };
  }
  const wants = (dish: string): number => roster.filter(member => vote(round1, member, dish) === "WANT").length;
  const score = (dish: string): number => {
    const want = wants(dish);
    return scoreVotes(want, roster.length - want);
  };
  const bestScore = Math.max(...survivors.map(score));
  const candidates = survivors.filter(dish => score(dish) === bestScore);
  const tier = classifyTier(roster.length, wants(candidates[0]!), true) as Exclude<MatchTier, "NO_CONSENSUS">;
  return { ...base, status: "DECISION_READY", candidateIds: candidates,
    reasonCode: "ACCEPTABLE_FINAL", matchTier: tier };
}
