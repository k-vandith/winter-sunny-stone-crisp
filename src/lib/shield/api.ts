import type { DatasetId, DatasetInfo } from "@/lib/shield/datasets";

export type AttackKind = "fgsm" | "pgd";
export type ModelId = "rf" | "svm" | "dnn" | "dnn-sq" | "at" | "ensemble" | "hybrid";

export type Confusion = {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  fpr: number;
  fnr: number;
};

export type FamilyStat = {
  family: "normal" | "dos" | "probe" | "r2l" | "u2r";
  support: number;
  clean: number;
  adv: number;
};

export type ModelScore = {
  id: ModelId;
  name: string;
  attack: string;
  clean: Confusion;
  adv: Confusion;
  asr: number;
  asrs: number;
  latencyMs: number;
  families: FamilyStat[];
};

export type SweepPoint = {
  epsilon: number;
  f1: Record<ModelId, number>;
};

export type FlowExample = {
  id: number;
  family: FamilyStat["family"];
  y: 0 | 1;
  clean: 0 | 1;
  adv: 0 | 1;
  hybrid: 0 | 1;
  maxDelta: number;
  feature: string;
  delta: number;
};

export type BenchResult = {
  run_id: string;
  dataset: DatasetId;
  dataset_kind: "recorded" | "scenario";
  seed: number;
  limit: number;
  attack: AttackKind;
  epsilon: number;
  steps: number;
  trainN: number;
  testN: number;
  ms: number;
  attacks: number;
  benign: number;
  scores: ModelScore[];
  curve: SweepPoint[] | null;
  flows: FlowExample[];
};

type JobStatus = {
  run_id: string;
  phase: "running" | "ready" | "error";
  progress: string;
  error: string;
  result: BenchResult | null;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : String(item)))
        .join("; ");
    }
  } catch {
    // Fall through to the status text.
  }
  return response.statusText || "The Python bench returned an error.";
}

export async function fetchDatasets(): Promise<DatasetInfo[]> {
  const response = await fetch("/api/datasets");
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as DatasetInfo[];
}

export async function startTrain(body: {
  dataset: DatasetId;
  seed: number;
  limit: number;
  attack: AttackKind;
  epsilon: number;
  steps: number;
}): Promise<string> {
  const response = await fetch("/api/bench/train", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as { run_id: string };
  return payload.run_id;
}

export async function fetchResult(runId: string): Promise<JobStatus> {
  const response = await fetch(`/api/bench/results/${runId}`);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as JobStatus;
}

export async function rescoreBench(body: {
  run_id: string;
  attack: AttackKind;
  epsilon: number;
  steps: number;
  full: boolean;
}): Promise<{ scores: ModelScore[]; flows: FlowExample[]; curve: SweepPoint[] | null }> {
  const response = await fetch("/api/bench/rescore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { scores: ModelScore[]; flows: FlowExample[]; curve: SweepPoint[] | null };
}
