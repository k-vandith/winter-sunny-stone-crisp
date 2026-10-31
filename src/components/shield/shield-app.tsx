import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Shield } from "lucide-react";
import { DATASET_FALLBACK, type DatasetId, type DatasetInfo } from "@/lib/shield/datasets";
import { ANCHORS, SURVEY, TEAM } from "@/lib/shield/literature";
import {
  fetchDatasets,
  fetchResult,
  rescoreBench,
  startTrain,
  type AttackKind,
  type BenchResult,
  type FlowExample,
  type ModelId,
  type ModelScore,
  type SweepPoint,
} from "@/lib/shield/api";

type View = "bench" | "curve" | "flows" | "method" | "survey";
type Phase = "idle" | "running" | "ready" | "error";

type Config = { dataset: DatasetId; seed: number; limit: number };

const TABS: { id: View; label: string }[] = [
  { id: "bench", label: "Bench" },
  { id: "curve", label: "Curve" },
  { id: "flows", label: "Flows" },
  { id: "method", label: "Method" },
  { id: "survey", label: "Survey" },
];

const SHORT: Record<ModelId, string> = {
  rf: "Forest",
  svm: "SVM",
  dnn: "Network",
  "dnn-sq": "Squeeze",
  at: "Adv. train",
  ensemble: "Vote",
  hybrid: "Hybrid",
};

const FAMILY: Record<string, string> = {
  normal: "Normal",
  dos: "DoS",
  probe: "Probe",
  r2l: "R2L",
  u2r: "U2R",
};

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function mergeScores(next: ModelScore[], prev: ModelScore[] | null): ModelScore[] {
  if (!prev) return next;
  return next.map((row) => {
    const prior = prev.find((item) => item.id === row.id);
    return { ...row, asrs: prior?.asrs ?? row.asrs };
  });
}

export function ShieldApp() {
  const [view, setView] = useState<View>("bench");
  const [dataset, setDataset] = useState<DatasetId>("nsl-kdd");
  const [seed, setSeed] = useState(10);
  const [limit, setLimit] = useState(1400);
  const [attack, setAttack] = useState<AttackKind>("pgd");
  const [epsilon, setEpsilon] = useState(0.1);
  const [steps, setSteps] = useState(7);
  const [focus, setFocus] = useState<ModelId>("hybrid");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState("Ready to fit the bench.");
  const [error, setError] = useState("");
  const [scores, setScores] = useState<ModelScore[] | null>(null);
  const [curve, setCurve] = useState<SweepPoint[] | null>(null);
  const [flows, setFlows] = useState<FlowExample[] | null>(null);
  const [trained, setTrained] = useState<Config | null>(null);
  const [catalog, setCatalog] = useState<DatasetInfo[]>(DATASET_FALLBACK);
  const [split, setSplit] = useState({ trainN: 0, testN: 0, ms: 0, attacks: 0, benign: 0 });
  const runIdRef = useRef<string | null>(null);
  const job = useRef(0);
  const scoreTicket = useRef(0);
  const rescoreTimer = useRef<number | null>(null);

  function applyResult(result: BenchResult) {
    runIdRef.current = result.run_id;
    setScores(result.scores);
    setCurve(result.curve);
    setFlows(result.flows);
    setSplit({
      trainN: result.trainN,
      testN: result.testN,
      ms: result.ms,
      attacks: result.attacks,
      benign: result.benign,
    });
    setTrained({ dataset: result.dataset, seed: result.seed, limit: result.limit });
  }

  async function run(config: Config, attackKind: AttackKind, eps: number, pgdSteps: number) {
    const id = ++job.current;
    scoreTicket.current += 1;
    setPhase("running");
    setError("");
    setProgress("Starting");
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      if (job.current !== id) return;
      try {
        const runId = await startTrain({
          dataset: config.dataset,
          seed: config.seed,
          limit: config.limit,
          attack: attackKind,
          epsilon: eps,
          steps: pgdSteps,
        });
        if (job.current !== id) return;
        for (let poll = 0; poll < 240; poll++) {
          const status = await fetchResult(runId);
          if (job.current !== id) return;
          if (status.progress) setProgress(status.progress);
          if (status.phase === "ready" && status.result) {
            applyResult(status.result);
            setPhase("ready");
            return;
          }
          if (status.phase === "error") {
            throw new Error(status.error || "The bench failed to fit.");
          }
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        throw new Error("Training is taking too long. Try a smaller flow limit.");
      } catch (cause) {
        lastError = cause;
        const message = cause instanceof Error ? cause.message : "";
        const waiting = attempt < 19 && /fetch|network|failed to fetch|load/i.test(message);
        if (!waiting) break;
        if (job.current === id) setProgress("Waiting for the Python bench…");
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    }
    if (job.current !== id) return;
    setPhase("error");
    setError(lastError instanceof Error ? lastError.message : "The bench failed to fit.");
  }

  useEffect(() => {
    void fetchDatasets()
      .then((rows) => {
        if (rows.length > 0) setCatalog(rows);
      })
      .catch(() => {});
    void run({ dataset: "nsl-kdd", seed: 10, limit: 1400 }, "pgd", 0.1, 7);
    // Mount only: the first fit is the demo. Later refits are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function rescore(nextAttack: AttackKind, eps: number, pgdSteps: number, full: boolean) {
    const runId = runIdRef.current;
    if (!runId || phase === "running") return;
    const ticket = ++scoreTicket.current;
    if (full) setProgress("Re-scoring this attack");
    try {
      const payload = await rescoreBench({
        run_id: runId,
        attack: nextAttack,
        epsilon: eps,
        steps: pgdSteps,
        full,
      });
      if (ticket !== scoreTicket.current) return;
      if (full) {
        setScores(payload.scores);
        if (payload.curve) setCurve(payload.curve);
        setProgress("Attack updated.");
      } else {
        setScores(mergeScores(payload.scores, scores));
      }
      setFlows(payload.flows);
    } catch (cause) {
      if (ticket !== scoreTicket.current) return;
      setError(cause instanceof Error ? cause.message : "Could not rescore this attack.");
    }
  }

  function scheduleRescore(nextAttack: AttackKind, eps: number, pgdSteps: number, full: boolean) {
    if (rescoreTimer.current) window.clearTimeout(rescoreTimer.current);
    rescoreTimer.current = window.setTimeout(() => {
      void rescore(nextAttack, eps, pgdSteps, full);
    }, full ? 0 : 160);
  }

  const info = catalog.find((item) => item.id === dataset) ?? catalog[0];
  const focused = scores?.find((row) => row.id === focus) ?? null;
  const stale =
    trained !== null &&
    (trained.dataset !== dataset || trained.seed !== seed || trained.limit !== limit);
  const leader = scores ? scores.slice().sort((a, b) => b.asrs - a.asrs)[0] : null;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink text-surface">
              <Shield className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                KLEF · CSE · Capstone I
              </p>
              <h1 className="mt-1 text-4xl">AdversarialShield</h1>
              <p className="mt-1 max-w-xl text-sm text-muted">
                A working attack, defense, and scoring bench for machine-learning intrusion detection.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[20rem_1fr]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-2xl">Dataset</h2>
            <div className="mt-3 flex flex-col gap-2">
              {catalog.map((item) => {
                const selected = item.id === dataset;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDataset(item.id)}
                    className={
                      "min-h-11 rounded-lg border px-3 py-2 text-left " +
                      (selected ? "border-accent bg-accent/10" : "border-line bg-bg")
                    }
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-xs tracking-wide text-muted uppercase">
                        {item.kind === "recorded" ? "Recorded" : "Scenario"}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted">{item.origin}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-muted">{info.summary}</p>
          </section>

          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-2xl">Attack</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["fgsm", "pgd"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={attack === kind}
                  className={
                    "min-h-11 rounded-lg border border-line font-semibold uppercase " +
                    (attack === kind ? "bg-ink text-surface" : "bg-bg text-ink")
                  }
                  onClick={() => {
                    setAttack(kind);
                    scheduleRescore(kind, epsilon, steps, true);
                  }}
                >
                  {kind}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium" htmlFor="epsilon">
              L∞ budget ε · {epsilon.toFixed(2)}
            </label>
            <input
              id="epsilon"
              type="range"
              min={0}
              max={0.3}
              step={0.01}
              value={epsilon}
              onChange={(event) => {
                const value = Number(event.target.value);
                setEpsilon(value);
                scheduleRescore(attack, value, steps, false);
              }}
            />
            <label className="mt-3 block text-sm font-medium" htmlFor="steps">
              PGD steps · {steps}
            </label>
            <input
              id="steps"
              type="range"
              min={1}
              max={10}
              step={1}
              value={steps}
              disabled={attack === "fgsm"}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSteps(value);
                scheduleRescore(attack, epsilon, value, true);
              }}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm font-medium" htmlFor="seed">
                Seed
                <input
                  id="seed"
                  type="number"
                  min={1}
                  value={seed}
                  onChange={(event) => setSeed(Number(event.target.value) || 1)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3"
                />
              </label>
              <label className="text-sm font-medium" htmlFor="limit">
                Flows · {limit}
                <input
                  id="limit"
                  type="range"
                  min={800}
                  max={1700}
                  step={100}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={phase === "running"}
              onClick={() => void run({ dataset, seed, limit }, attack, epsilon, steps)}
              className="mt-4 min-h-11 w-full rounded-lg bg-accent px-4 font-semibold text-accent-fg disabled:opacity-60"
            >
              {phase === "running" ? "Fitting models…" : "Train and score"}
            </button>
            <p className="mt-2 text-sm text-muted" role="status">
              {progress}
            </p>
            {stale ? (
              <p className="mt-2 text-sm text-danger">
                Dataset, seed, or sample size changed. Train again to refresh these scores.
              </p>
            ) : null}
            {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          </section>
        </aside>

        <main className="min-w-0">
          <div className="flex gap-2 overflow-x-auto pb-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={view === tab.id}
                onClick={() => setView(tab.id)}
                className={
                  "min-h-11 shrink-0 rounded-lg border px-4 font-medium " +
                  (view === tab.id
                    ? "border-ink bg-ink text-surface"
                    : "border-line bg-surface text-ink")
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {view === "bench" ? (
            <BenchView
              scores={scores}
              focused={focused}
              focus={focus}
              onFocus={setFocus}
              leader={leader ?? null}
              attack={attack}
              epsilon={epsilon}
              split={split}
              phase={phase}
            />
          ) : null}
          {view === "curve" ? <CurveView curve={curve} phase={phase} /> : null}
          {view === "flows" ? (
            <FlowsView flows={flows} epsilon={epsilon} attack={attack} phase={phase} />
          ) : null}
          {view === "method" ? <MethodView /> : null}
          {view === "survey" ? <SurveyView /> : null}
        </main>
      </div>
    </div>
  );
}

function BenchView({
  scores,
  focused,
  focus,
  onFocus,
  leader,
  attack,
  epsilon,
  split,
  phase,
}: {
  scores: ModelScore[] | null;
  focused: ModelScore | null;
  focus: ModelId;
  onFocus: (id: ModelId) => void;
  leader: ModelScore | null;
  attack: AttackKind;
  epsilon: number;
  split: { trainN: number; testN: number; ms: number; attacks: number; benign: number };
  phase: Phase;
}) {
  const dnn = scores?.find((row) => row.id === "dnn");
  const forest = scores?.find((row) => row.id === "rf");
  const hybrid = scores?.find((row) => row.id === "hybrid");
  const chartData =
    scores?.map((row) => ({
      name: SHORT[row.id],
      Clean: Number(row.clean.f1.toFixed(3)),
      Attacked: Number(row.adv.f1.toFixed(3)),
    })) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-l-4 border-line border-l-accent bg-surface p-4">
        {phase === "running" && !scores ? (
          <p className="text-sm text-muted">
            Fitting a forest, a linear SVM, and a small network in Python, then hardening them.
          </p>
        ) : null}
        {dnn && forest && hybrid && leader ? (
          <p className="text-sm">
            At {attack.toUpperCase()} with ε = {epsilon.toFixed(2)}, the clean network moves from{" "}
            {pct(dnn.clean.f1)} F1 to {pct(dnn.adv.f1)}. Transfer drops the forest to{" "}
            {pct(forest.adv.f1)}. {leader.name} leads ASRS at {leader.asrs.toFixed(2)}. Hybrid holds{" "}
            {pct(hybrid.adv.f1)} F1, with attack success {pct(hybrid.asr)}.
          </p>
        ) : (
          <p className="text-sm text-muted">Scores appear as soon as the first fit finishes.</p>
        )}
        {split.testN > 0 ? (
          <p className="mt-2 text-xs text-muted">
            Train {split.trainN} · test {split.testN} ({split.benign} benign / {split.attacks}{" "}
            intrusion) · fit {Math.round(split.ms)} ms. Intrusion rows only are perturbed.
          </p>
        ) : null}
      </section>

      {focused ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Clean F1" value={pct(focused.clean.f1)} />
          <Stat label="Attacked F1" value={pct(focused.adv.f1)} tone="danger" />
          <Stat label="Attack success" value={pct(focused.asr)} tone="danger" />
          <Stat label="ASRS" value={focused.asrs.toFixed(2)} tone="safe" />
        </div>
      ) : null}

      <section className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-3 py-3 font-medium">Model</th>
              <th className="px-3 py-3 font-medium">Clean F1</th>
              <th className="px-3 py-3 font-medium">Attacked F1</th>
              <th className="px-3 py-3 font-medium">Detection</th>
              <th className="px-3 py-3 font-medium">False alarm</th>
              <th className="px-3 py-3 font-medium">ASR</th>
              <th className="px-3 py-3 font-medium">ASRS</th>
            </tr>
          </thead>
          <tbody>
            {scores?.map((row) => {
              const selected = row.id === focus;
              return (
                <tr
                  key={row.id}
                  className={"border-t border-line " + (selected ? "bg-accent/10" : "")}
                  onClick={() => onFocus(row.id)}
                >
                  <td className="px-3 py-3">
                    <button type="button" className="text-left font-semibold" onClick={() => onFocus(row.id)}>
                      {row.name}
                    </button>
                    <span className="block text-xs text-muted">{row.attack}</span>
                  </td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.clean.f1)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.adv.f1)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.adv.recall)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.adv.fpr)}</td>
                  <td className="px-3 py-3 tabular-nums">{pct(row.asr)}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums">{row.asrs.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!scores ? <p className="px-3 py-6 text-sm text-muted">Waiting for the first fit.</p> : null}
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-2xl">Clean F1 against attacked F1</h2>
        <p className="mt-1 text-sm text-muted">Select a row to inspect that model. Positive class is intrusion.</p>
        <div className="mt-3 h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                <YAxis domain={[0, 1]} tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => pct(Number(value))}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="Clean" fill="var(--color-ink)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Attacked" fill="var(--color-danger)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </section>

      {focused ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-2xl">By attack family</h2>
            <p className="mt-1 text-sm text-muted">
              {focused.name}. Attacks show detection rate. Normal shows the false-alarm rate.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {focused.families.map((family) => (
                <li key={family.family} className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-medium">{FAMILY[family.family]}</span>
                  <span className="text-muted">n = {family.support}</span>
                  <span className="tabular-nums">
                    {pct(family.clean)} → {pct(family.adv)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-2xl">Attacked confusion</h2>
            <p className="mt-1 text-sm text-muted">{focused.name} after the current perturbation.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <span />
              <span className="text-xs tracking-wide text-muted uppercase">Pred benign</span>
              <span className="text-xs tracking-wide text-muted uppercase">Pred attack</span>
              <span className="text-xs tracking-wide text-muted uppercase">Benign</span>
              <Cell value={focused.adv.tn} />
              <Cell value={focused.adv.fp} warn={focused.adv.fp > 0} />
              <span className="text-xs tracking-wide text-muted uppercase">Attack</span>
              <Cell value={focused.adv.fn} warn={focused.adv.fn > 0} />
              <Cell value={focused.adv.tp} />
            </div>
            <p className="mt-3 text-xs text-muted">
              Precision {pct(focused.adv.precision)} · recall {pct(focused.adv.recall)} · accuracy{" "}
              {pct(focused.adv.accuracy)} · {focused.latencyMs.toFixed(3)} ms / flow
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Cell({ value, warn = false }: { value: number; warn?: boolean }) {
  return (
    <span
      className={
        "rounded-lg border border-line bg-bg py-3 font-semibold tabular-nums " +
        (warn ? "text-danger" : "text-ink")
      }
    >
      {value}
    </span>
  );
}

function Stat({ label, value, tone = "ink" }: { label: string; value: string; tone?: "ink" | "danger" | "safe" }) {
  const color = tone === "danger" ? "text-danger" : tone === "safe" ? "text-safe" : "text-ink";
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-3">
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className={"mt-1 font-display text-3xl tabular-nums " + color}>{value}</p>
    </div>
  );
}

function CurveView({ curve, phase }: { curve: SweepPoint[] | null; phase: Phase }) {
  const data =
    curve?.map((point) => ({
      eps: point.epsilon.toFixed(2),
      Forest: point.f1.rf,
      Network: point.f1.dnn,
      "Adv. train": point.f1.at,
      Hybrid: point.f1.hybrid,
    })) ?? [];
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-3xl">F1 against attack strength</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Each point is the same trained models under a larger L∞ ball. ASRS is the weighted average of
        F1 retention at 0.05, 0.10, 0.20, and 0.30, with weights 0.1, 0.2, 0.3, and 0.4. Stronger
        attacks count more. Feature squeezing is omitted here — the bench table shows it does not
        survive an adaptive attacker.
      </p>
      <div className="mt-4 h-80 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="var(--color-line)" />
              <XAxis dataKey="eps" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
              <YAxis domain={[0, 1]} tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
              <Tooltip
                formatter={(value) => pct(Number(value))}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="Forest" stroke="var(--color-muted)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Network" stroke="var(--color-danger)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Adv. train" stroke="var(--color-ink)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Hybrid" stroke="var(--color-accent)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted">{phase === "running" ? "Scoring the sweep…" : "Train the bench to draw the curve."}</p>
        )}
      </div>
    </section>
  );
}

function FlowsView({
  flows,
  epsilon,
  attack,
  phase,
}: {
  flows: FlowExample[] | null;
  epsilon: number;
  attack: AttackKind;
  phase: Phase;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-3xl">Perturbed intrusion flows</h2>
      <p className="mt-2 text-sm text-muted">
        White-box {attack.toUpperCase()} at ε = {epsilon.toFixed(2)} on the network. Hybrid is the
        defended committee on its own adaptive attack, not a copy of the network’s example.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-2 py-3 font-medium">Family</th>
              <th className="px-2 py-3 font-medium">Network clean</th>
              <th className="px-2 py-3 font-medium">Network attacked</th>
              <th className="px-2 py-3 font-medium">Hybrid</th>
              <th className="px-2 py-3 font-medium">Largest move</th>
            </tr>
          </thead>
          <tbody>
            {flows?.map((flow) => (
              <tr key={flow.id} className="border-t border-line">
                <td className="px-2 py-3 font-medium">{FAMILY[flow.family]}</td>
                <td className="px-2 py-3">{flow.clean === 1 ? "Attack" : "Miss"}</td>
                <td className={"px-2 py-3 " + (flow.clean === 1 && flow.adv === 0 ? "text-danger" : "")}>
                  {flow.adv === 1 ? "Attack" : "Evaded"}
                </td>
                <td className={"px-2 py-3 " + (flow.hybrid === 1 ? "text-safe" : "text-danger")}>
                  {flow.hybrid === 1 ? "Caught" : "Missed"}
                </td>
                <td className="px-2 py-3 tabular-nums">
                  {flow.feature} {flow.delta >= 0 ? "+" : ""}
                  {flow.delta.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!flows ? (
          <p className="py-6 text-sm text-muted">{phase === "running" ? "Waiting for scores." : "No flows yet."}</p>
        ) : null}
      </div>
    </section>
  );
}

function MethodView() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-3xl">What this bench actually does</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>Stratified split of flows into train and test, by attack family. Encoders and scalers are fit on the training split only.</li>
          <li>Clean baselines in Python: a scikit-learn random forest, a scikit-learn linear SVC with train-only standardization, and a PyTorch network with two ReLU layers trained by Adam.</li>
          <li>Evasion attacks on intrusion rows only, inside an L∞ ball on features scaled to [0, 1]. FGSM is one signed gradient step. PGD iterates, projects back into the ε-ball, and clips to valid bounds.</li>
          <li>Gradients come from the PyTorch network. The forest and the SVM are not differentiated; they are scored on examples transferred from that network. Non-adaptive attacks are generated with ART’s FGSM and PGD. The signed step is the CleverHans / Goodfellow update.</li>
          <li>Defenses: feature squeezing fit on clean training ranges, Madry-style adversarial training, and a forest plus SVM refit on PGD-augmented intrusions.</li>
          <li>Hybrid rule: squeeze the input, then alert if the robust network alerts, or if the defended forest and SVM both alert. The attacker is adaptive and uses a straight-through estimate through the squeeze.</li>
        </ol>
      </section>
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-3xl">Robustness score</h2>
        <p className="mt-2 text-sm">
          ASRS = 0.10·r(0.05) + 0.20·r(0.10) + 0.30·r(0.20) + 0.40·r(0.30), where r(ε) = min(1, F1 at ε / clean F1).
          A score of 1 means no F1 loss across that sweep. Attack success rate is separate: among intrusions the clean model already caught, the share the attack flips to benign.
        </p>
      </section>
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-3xl">Data, and what it is not</h2>
        <p className="mt-2 text-sm">
          NSL-KDD ships as a fixed stratified subsample of the real KDDTrain+ file (720 normal, 480 DoS, 300 probe, 220 R2L, all 52 U2R). Bytes and counts are scaled into [0, 1]. CICIDS2017 and UNSW-NB15 stay in scenario mode until the real CSV or text files are placed in datasets/raw — the bench then loads those files, encodes categories, and scales from the training split only. The same Python training, attack, and scoring path runs for every dataset.
        </p>
        <p className="mt-2 text-sm text-muted">
          These are feature-space attacks. Not every perturbed coordinate is a legal packet. U2R has 52 source rows, so its rate is noisy. Feature squeezing alone does not hold once the attacker knows about it. Hybrid trades a little clean precision for a much lower evasion rate.
        </p>
      </section>
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-3xl">Team</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {TEAM.map((person) => (
            <li key={person.roll} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
              <span className="font-medium">{person.name}</span>
              <span className="text-muted tabular-nums">{person.roll}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Koneru Lakshmaiah Education Foundation · Department of Computer Science and Engineering ·
          Engineering Capstone Project I.
        </p>
      </section>
    </div>
  );
}

function SurveyView() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-3xl">Research literature matrix</h2>
        <p className="mt-2 text-sm text-muted">
          Six papers that frame the gap this bench is built to close. Venue names follow the capstone survey. Use the anchors below when a DOI needs to be checked.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {SURVEY.map((paper) => (
            <article key={paper.title} className="rounded-lg border border-line bg-bg p-3">
              <p className="text-xs tracking-wide text-muted uppercase">
                {paper.year} · {paper.venue}
              </p>
              <h3 className="mt-1 text-2xl">{paper.title}</h3>
              <p className="text-sm text-muted">{paper.authors}</p>
              <dl className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Techniques</dt>
                  <dd>{paper.techniques}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Dataset</dt>
                  <dd>{paper.dataset}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Finding</dt>
                  <dd>{paper.finding}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted uppercase">Gap this bench targets</dt>
                  <dd>{paper.gap}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-3xl">Anchors</h2>
        <ul className="mt-3 flex flex-col gap-3 text-sm">
          {ANCHORS.map((item) => (
            <li key={item.href}>
              <a className="underline decoration-line underline-offset-2" href={item.href}>
                {item.ref}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
