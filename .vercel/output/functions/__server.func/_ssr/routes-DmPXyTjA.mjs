import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Shield } from "../_libs/lucide-react.mjs";
import { a as Line, c as ResponsiveContainer, i as XAxis, l as Tooltip, n as LineChart, o as CartesianGrid, r as YAxis, s as Bar, t as BarChart, u as Legend } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DmPXyTjA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var DATASET_FALLBACK = [
	{
		id: "nsl-kdd",
		name: "NSL-KDD",
		kind: "recorded",
		origin: "KDDTrain+ · University of New Brunswick",
		summary: "Stratified subsample of the real KDDTrain+ file: 720 normal, 480 DoS, 300 probe, 220 R2L, and all 52 U2R rows. Bytes and counts are scaled into [0, 1]; rates are unchanged."
	},
	{
		id: "cicids2017",
		name: "CICIDS2017",
		kind: "scenario",
		origin: "Flow-feature scenario · CIC schema",
		summary: "Class-conditional flows on the CICIDS2017 numeric schema (duration, packet counts, SYN/ACK, window sizes). Same pipeline as NSL-KDD. Scenario mode — not the raw capture."
	},
	{
		id: "unsw-nb15",
		name: "UNSW-NB15",
		kind: "scenario",
		origin: "Flow-feature scenario · UNSW schema",
		summary: "Class-conditional flows on the UNSW-NB15 schema (rate, TTL, load, connection counts). Used to check that the defense is not an NSL-KDD-only trick. Scenario mode — not the raw capture."
	}
];
var SURVEY = [
	{
		year: "2020",
		authors: "Wang et al.",
		title: "Evasion Attacks against ML-based IDS",
		venue: "NDSS",
		objective: "Analyze evasion techniques",
		techniques: "GAN-based generation",
		dataset: "CICIDS2017",
		finding: "Adversarial samples cut accuracy by about 40%",
		gap: "Attack study only — no defense in the loop"
	},
	{
		year: "2021",
		authors: "Zhang et al.",
		title: "Adversarial Examples in Network Traffic",
		venue: "IEEE TIFS",
		objective: "Generate transferable attacks",
		techniques: "FGSM, PGD",
		dataset: "UNSW-NB15",
		finding: "Attacks transfer across models",
		gap: "No hybrid defense against transferred examples"
	},
	{
		year: "2022",
		authors: "Lin et al.",
		title: "Adversarial Attacks and Defenses in NIDS: Survey",
		venue: "ACM CSUR",
		objective: "Survey the state of the art",
		techniques: "Literature review",
		dataset: "—",
		finding: "Robustness is scored inconsistently",
		gap: "No standard multi-intensity metric"
	},
	{
		year: "2023",
		authors: "Apruzzese et al.",
		title: "Adversarial Robustness of ML-based NIDS",
		venue: "IEEE TNSM",
		objective: "Compare model robustness",
		techniques: "RF, DNN, SVM",
		dataset: "NSL-KDD",
		finding: "Ensembles improve robustness",
		gap: "Latency and resource cost not reported"
	},
	{
		year: "2024",
		authors: "Liu et al.",
		title: "Hybrid Defense Framework for NIDS",
		venue: "Computer Networks",
		objective: "Combine training and sanitization",
		techniques: "Adversarial training + sanitization",
		dataset: "CICIDS2017",
		finding: "Hybrid lift around 25%",
		gap: "Heavy compute, weak on sparse features"
	},
	{
		year: "2024",
		authors: "Singh & Patel",
		title: "Robustness Evaluation of DNN in NIDS",
		venue: "IEEE Access",
		objective: "Benchmark a network under PGD",
		techniques: "PGD, CW",
		dataset: "UNSW-NB15",
		finding: "DNN fails once ε passes 0.1",
		gap: "No defense against CW-style attacks"
	}
];
var ANCHORS = [
	{
		ref: "Goodfellow, Shlens, Szegedy. Explaining and Harnessing Adversarial Examples. ICLR, 2015.",
		href: "https://arxiv.org/abs/1412.6572"
	},
	{
		ref: "Madry, Makelov, Schmidt, Tsipras, Vladu. Towards Deep Learning Models Resistant to Adversarial Attacks. ICLR, 2018.",
		href: "https://arxiv.org/abs/1706.06083"
	},
	{
		ref: "Carlini, Wagner. Towards Evaluating the Robustness of Neural Networks. IEEE S&P, 2017.",
		href: "https://arxiv.org/abs/1608.04644"
	},
	{
		ref: "He, Kim, Asghar. Adversarial Machine Learning for Network Intrusion Detection Systems: A Comprehensive Survey. IEEE COMST, 2023. DOI 10.1109/COMST.2022.3233793.",
		href: "https://doi.org/10.1109/COMST.2022.3233793"
	},
	{
		ref: "NSL-KDD, Canadian Institute for Cybersecurity, University of New Brunswick.",
		href: "https://www.unb.ca/cic/datasets/nsl.html"
	}
];
var TEAM = [
	{
		name: "Kondoju Kartikeya Vandith Manohar",
		roll: "2320030299"
	},
	{
		name: "Anisetti Deepika",
		roll: "2320030378"
	},
	{
		name: "Siddamsetty Sandeep",
		roll: "2320030317"
	}
];
async function readError(response) {
	try {
		const body = await response.json();
		if (typeof body.detail === "string") return body.detail;
		if (Array.isArray(body.detail)) return body.detail.map((item) => item && typeof item === "object" && "msg" in item ? String(item.msg) : String(item)).join("; ");
	} catch {}
	return response.statusText || "The Python bench returned an error.";
}
async function fetchDatasets() {
	const response = await fetch("/api/datasets");
	if (!response.ok) throw new Error(await readError(response));
	return await response.json();
}
async function startTrain(body) {
	const response = await fetch("/api/bench/train", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body)
	});
	if (!response.ok) throw new Error(await readError(response));
	return (await response.json()).run_id;
}
async function fetchResult(runId) {
	const response = await fetch(`/api/bench/results/${runId}`);
	if (!response.ok) throw new Error(await readError(response));
	return await response.json();
}
async function rescoreBench(body) {
	const response = await fetch("/api/bench/rescore", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body)
	});
	if (!response.ok) throw new Error(await readError(response));
	return await response.json();
}
var TABS = [
	{
		id: "bench",
		label: "Bench"
	},
	{
		id: "curve",
		label: "Curve"
	},
	{
		id: "flows",
		label: "Flows"
	},
	{
		id: "method",
		label: "Method"
	},
	{
		id: "survey",
		label: "Survey"
	}
];
var SHORT = {
	rf: "Forest",
	svm: "SVM",
	dnn: "Network",
	"dnn-sq": "Squeeze",
	at: "Adv. train",
	ensemble: "Vote",
	hybrid: "Hybrid"
};
var FAMILY = {
	normal: "Normal",
	dos: "DoS",
	probe: "Probe",
	r2l: "R2L",
	u2r: "U2R"
};
function pct(value) {
	return `${(value * 100).toFixed(1)}%`;
}
function mergeScores(next, prev) {
	if (!prev) return next;
	return next.map((row) => {
		const prior = prev.find((item) => item.id === row.id);
		return {
			...row,
			asrs: prior?.asrs ?? row.asrs
		};
	});
}
function ShieldApp() {
	const [view, setView] = (0, import_react.useState)("bench");
	const [dataset, setDataset] = (0, import_react.useState)("nsl-kdd");
	const [seed, setSeed] = (0, import_react.useState)(10);
	const [limit, setLimit] = (0, import_react.useState)(1400);
	const [attack, setAttack] = (0, import_react.useState)("pgd");
	const [epsilon, setEpsilon] = (0, import_react.useState)(.1);
	const [steps, setSteps] = (0, import_react.useState)(7);
	const [focus, setFocus] = (0, import_react.useState)("hybrid");
	const [phase, setPhase] = (0, import_react.useState)("idle");
	const [progress, setProgress] = (0, import_react.useState)("Ready to fit the bench.");
	const [error, setError] = (0, import_react.useState)("");
	const [scores, setScores] = (0, import_react.useState)(null);
	const [curve, setCurve] = (0, import_react.useState)(null);
	const [flows, setFlows] = (0, import_react.useState)(null);
	const [trained, setTrained] = (0, import_react.useState)(null);
	const [catalog, setCatalog] = (0, import_react.useState)(DATASET_FALLBACK);
	const [split, setSplit] = (0, import_react.useState)({
		trainN: 0,
		testN: 0,
		ms: 0,
		attacks: 0,
		benign: 0
	});
	const runIdRef = (0, import_react.useRef)(null);
	const job = (0, import_react.useRef)(0);
	const scoreTicket = (0, import_react.useRef)(0);
	const rescoreTimer = (0, import_react.useRef)(null);
	function applyResult(result) {
		runIdRef.current = result.run_id;
		setScores(result.scores);
		setCurve(result.curve);
		setFlows(result.flows);
		setSplit({
			trainN: result.trainN,
			testN: result.testN,
			ms: result.ms,
			attacks: result.attacks,
			benign: result.benign
		});
		setTrained({
			dataset: result.dataset,
			seed: result.seed,
			limit: result.limit
		});
	}
	async function run(config, attackKind, eps, pgdSteps) {
		const id = ++job.current;
		scoreTicket.current += 1;
		setPhase("running");
		setError("");
		setProgress("Starting");
		let lastError = null;
		for (let attempt = 0; attempt < 20; attempt++) {
			if (job.current !== id) return;
			try {
				const runId = await startTrain({
					dataset: config.dataset,
					seed: config.seed,
					limit: config.limit,
					attack: attackKind,
					epsilon: eps,
					steps: pgdSteps
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
					if (status.phase === "error") throw new Error(status.error || "The bench failed to fit.");
					await new Promise((resolve) => setTimeout(resolve, 400));
				}
				throw new Error("Training is taking too long. Try a smaller flow limit.");
			} catch (cause) {
				lastError = cause;
				const message = cause instanceof Error ? cause.message : "";
				if (!(attempt < 19 && /fetch|network|failed to fetch|load/i.test(message))) break;
				if (job.current === id) setProgress("Waiting for the Python bench…");
				await new Promise((resolve) => setTimeout(resolve, 700));
			}
		}
		if (job.current !== id) return;
		setPhase("error");
		setError(lastError instanceof Error ? lastError.message : "The bench failed to fit.");
	}
	(0, import_react.useEffect)(() => {
		fetchDatasets().then((rows) => {
			if (rows.length > 0) setCatalog(rows);
		}).catch(() => {});
		run({
			dataset: "nsl-kdd",
			seed: 10,
			limit: 1400
		}, "pgd", .1, 7);
	}, []);
	async function rescore(nextAttack, eps, pgdSteps, full) {
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
				full
			});
			if (ticket !== scoreTicket.current) return;
			if (full) {
				setScores(payload.scores);
				if (payload.curve) setCurve(payload.curve);
				setProgress("Attack updated.");
			} else setScores(mergeScores(payload.scores, scores));
			setFlows(payload.flows);
		} catch (cause) {
			if (ticket !== scoreTicket.current) return;
			setError(cause instanceof Error ? cause.message : "Could not rescore this attack.");
		}
	}
	function scheduleRescore(nextAttack, eps, pgdSteps, full) {
		if (rescoreTimer.current) window.clearTimeout(rescoreTimer.current);
		rescoreTimer.current = window.setTimeout(() => {
			rescore(nextAttack, eps, pgdSteps, full);
		}, full ? 0 : 160);
	}
	const info = catalog.find((item) => item.id === dataset) ?? catalog[0];
	const focused = scores?.find((row) => row.id === focus) ?? null;
	const stale = trained !== null && (trained.dataset !== dataset || trained.seed !== seed || trained.limit !== limit);
	const leader = scores ? scores.slice().sort((a, b) => b.asrs - a.asrs)[0] : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-line bg-surface",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink text-surface",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, {
							className: "size-5",
							"aria-hidden": "true"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-semibold tracking-widest text-accent uppercase",
							children: "KLEF · CSE · Capstone I"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 text-4xl",
							children: "AdversarialShield"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 max-w-xl text-sm text-muted",
							children: "A working attack, defense, and scoring bench for machine-learning intrusion detection."
						})
					] })]
				})
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[20rem_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-lg border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-2xl",
							children: "Dataset"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 flex flex-col gap-2",
							children: catalog.map((item) => {
								const selected = item.id === dataset;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-pressed": selected,
									onClick: () => setDataset(item.id),
									className: "min-h-11 rounded-lg border px-3 py-2 text-left " + (selected ? "border-accent bg-accent/10" : "border-line bg-bg"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold",
											children: item.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs tracking-wide text-muted uppercase",
											children: item.kind === "recorded" ? "Recorded" : "Scenario"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-xs text-muted",
										children: item.origin
									})]
								}, item.id);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: info.summary
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-lg border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-2xl",
							children: "Attack"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 grid grid-cols-2 gap-2",
							children: ["fgsm", "pgd"].map((kind) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": attack === kind,
								className: "min-h-11 rounded-lg border border-line font-semibold uppercase " + (attack === kind ? "bg-ink text-surface" : "bg-bg text-ink"),
								onClick: () => {
									setAttack(kind);
									scheduleRescore(kind, epsilon, steps, true);
								},
								children: kind
							}, kind))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-4 block text-sm font-medium",
							htmlFor: "epsilon",
							children: ["L∞ budget ε · ", epsilon.toFixed(2)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "epsilon",
							type: "range",
							min: 0,
							max: .3,
							step: .01,
							value: epsilon,
							onChange: (event) => {
								const value = Number(event.target.value);
								setEpsilon(value);
								scheduleRescore(attack, value, steps, false);
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-3 block text-sm font-medium",
							htmlFor: "steps",
							children: ["PGD steps · ", steps]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "steps",
							type: "range",
							min: 1,
							max: 10,
							step: 1,
							value: steps,
							disabled: attack === "fgsm",
							onChange: (event) => {
								const value = Number(event.target.value);
								setSteps(value);
								scheduleRescore(attack, epsilon, value, true);
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-sm font-medium",
								htmlFor: "seed",
								children: ["Seed", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "seed",
									type: "number",
									min: 1,
									value: seed,
									onChange: (event) => setSeed(Number(event.target.value) || 1),
									className: "mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-sm font-medium",
								htmlFor: "limit",
								children: [
									"Flows · ",
									limit,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										id: "limit",
										type: "range",
										min: 800,
										max: 1700,
										step: 100,
										value: limit,
										onChange: (event) => setLimit(Number(event.target.value))
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: phase === "running",
							onClick: () => void run({
								dataset,
								seed,
								limit
							}, attack, epsilon, steps),
							className: "mt-4 min-h-11 w-full rounded-lg bg-accent px-4 font-semibold text-accent-fg disabled:opacity-60",
							children: phase === "running" ? "Fitting models…" : "Train and score"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							role: "status",
							children: progress
						}),
						stale ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-danger",
							children: "Dataset, seed, or sample size changed. Train again to refresh these scores."
						}) : null,
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-danger",
							children: error
						}) : null
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-2 overflow-x-auto pb-3",
						children: TABS.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-pressed": view === tab.id,
							onClick: () => setView(tab.id),
							className: "min-h-11 shrink-0 rounded-lg border px-4 font-medium " + (view === tab.id ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink"),
							children: tab.label
						}, tab.id))
					}),
					view === "bench" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BenchView, {
						scores,
						focused,
						focus,
						onFocus: setFocus,
						leader: leader ?? null,
						attack,
						epsilon,
						split,
						phase
					}) : null,
					view === "curve" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CurveView, {
						curve,
						phase
					}) : null,
					view === "flows" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlowsView, {
						flows,
						epsilon,
						attack,
						phase
					}) : null,
					view === "method" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MethodView, {}) : null,
					view === "survey" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SurveyView, {}) : null
				]
			})]
		})]
	});
}
function BenchView({ scores, focused, focus, onFocus, leader, attack, epsilon, split, phase }) {
	const dnn = scores?.find((row) => row.id === "dnn");
	const forest = scores?.find((row) => row.id === "rf");
	const hybrid = scores?.find((row) => row.id === "hybrid");
	const chartData = scores?.map((row) => ({
		name: SHORT[row.id],
		Clean: Number(row.clean.f1.toFixed(3)),
		Attacked: Number(row.adv.f1.toFixed(3))
	})) ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-lg border border-l-4 border-line border-l-accent bg-surface p-4",
				children: [
					phase === "running" && !scores ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Fitting a forest, a linear SVM, and a small network in Python, then hardening them."
					}) : null,
					dnn && forest && hybrid && leader ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm",
						children: [
							"At ",
							attack.toUpperCase(),
							" with ε = ",
							epsilon.toFixed(2),
							", the clean network moves from",
							" ",
							pct(dnn.clean.f1),
							" F1 to ",
							pct(dnn.adv.f1),
							". Transfer drops the forest to",
							" ",
							pct(forest.adv.f1),
							". ",
							leader.name,
							" leads ASRS at ",
							leader.asrs.toFixed(2),
							". Hybrid holds",
							" ",
							pct(hybrid.adv.f1),
							" F1, with attack success ",
							pct(hybrid.asr),
							"."
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Scores appear as soon as the first fit finishes."
					}),
					split.testN > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-muted",
						children: [
							"Train ",
							split.trainN,
							" · test ",
							split.testN,
							" (",
							split.benign,
							" benign / ",
							split.attacks,
							" ",
							"intrusion) · fit ",
							Math.round(split.ms),
							" ms. Intrusion rows only are perturbed."
						]
					}) : null
				]
			}),
			focused ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 md:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Clean F1",
						value: pct(focused.clean.f1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Attacked F1",
						value: pct(focused.adv.f1),
						tone: "danger"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Attack success",
						value: pct(focused.asr),
						tone: "danger"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "ASRS",
						value: focused.asrs.toFixed(2),
						tone: "safe"
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "overflow-x-auto rounded-lg border border-line bg-surface",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[40rem] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-line text-xs tracking-wide text-muted uppercase",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Model"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Clean F1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Attacked F1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Detection"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "False alarm"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "ASR"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "ASRS"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: scores?.map((row) => {
						const selected = row.id === focus;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-line " + (selected ? "bg-accent/10" : ""),
							onClick: () => onFocus(row.id),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "text-left font-semibold",
										onClick: () => onFocus(row.id),
										children: row.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-xs text-muted",
										children: row.attack
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3 tabular-nums",
									children: pct(row.clean.f1)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3 tabular-nums",
									children: pct(row.adv.f1)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3 tabular-nums",
									children: pct(row.adv.recall)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3 tabular-nums",
									children: pct(row.adv.fpr)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3 tabular-nums",
									children: pct(row.asr)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3 font-semibold tabular-nums",
									children: row.asrs.toFixed(2)
								})
							]
						}, row.id);
					}) })]
				}), !scores ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-3 py-6 text-sm text-muted",
					children: "Waiting for the first fit."
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-lg border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-2xl",
						children: "Clean F1 against attacked F1"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Select a row to inspect that model. Positive class is intrusion."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 h-64 w-full",
						children: chartData.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
								data: chartData,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										stroke: "var(--color-line)",
										vertical: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "name",
										tick: {
											fill: "var(--color-muted)",
											fontSize: 12
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										domain: [0, 1],
										tick: {
											fill: "var(--color-muted)",
											fontSize: 12
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
										formatter: (value) => pct(Number(value)),
										contentStyle: {
											background: "var(--color-surface)",
											border: "1px solid var(--color-line)",
											borderRadius: "8px"
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "Clean",
										fill: "var(--color-ink)",
										radius: [
											3,
											3,
											0,
											0
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "Attacked",
										fill: "var(--color-danger)",
										radius: [
											3,
											3,
											0,
											0
										]
									})
								]
							})
						}) : null
					})
				]
			}),
			focused ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-lg border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-2xl",
							children: "By attack family"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted",
							children: [focused.name, ". Attacks show detection rate. Normal shows the false-alarm rate."]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 flex flex-col gap-2",
							children: focused.families.map((family) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: FAMILY[family.family]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-muted",
										children: ["n = ", family.support]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tabular-nums",
										children: [
											pct(family.clean),
											" → ",
											pct(family.adv)
										]
									})
								]
							}, family.family))
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-lg border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-2xl",
							children: "Attacked confusion"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted",
							children: [focused.name, " after the current perturbation."]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid grid-cols-3 gap-2 text-center text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs tracking-wide text-muted uppercase",
									children: "Pred benign"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs tracking-wide text-muted uppercase",
									children: "Pred attack"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs tracking-wide text-muted uppercase",
									children: "Benign"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { value: focused.adv.tn }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
									value: focused.adv.fp,
									warn: focused.adv.fp > 0
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs tracking-wide text-muted uppercase",
									children: "Attack"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
									value: focused.adv.fn,
									warn: focused.adv.fn > 0
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { value: focused.adv.tp })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-xs text-muted",
							children: [
								"Precision ",
								pct(focused.adv.precision),
								" · recall ",
								pct(focused.adv.recall),
								" · accuracy",
								" ",
								pct(focused.adv.accuracy),
								" · ",
								focused.latencyMs.toFixed(3),
								" ms / flow"
							]
						})
					]
				})]
			}) : null
		]
	});
}
function Cell({ value, warn = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "rounded-lg border border-line bg-bg py-3 font-semibold tabular-nums " + (warn ? "text-danger" : "text-ink"),
		children: value
	});
}
function Stat({ label, value, tone = "ink" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-line bg-surface px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs tracking-wide text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-display text-3xl tabular-nums " + (tone === "danger" ? "text-danger" : tone === "safe" ? "text-safe" : "text-ink"),
			children: value
		})]
	});
}
function CurveView({ curve, phase }) {
	const data = curve?.map((point) => ({
		eps: point.epsilon.toFixed(2),
		Forest: point.f1.rf,
		Network: point.f1.dnn,
		"Adv. train": point.f1.at,
		Hybrid: point.f1.hybrid
	})) ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-3xl",
				children: "F1 against attack strength"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-2xl text-sm text-muted",
				children: "Each point is the same trained models under a larger L∞ ball. ASRS is the weighted average of F1 retention at 0.05, 0.10, 0.20, and 0.30, with weights 0.1, 0.2, 0.3, and 0.4. Stronger attacks count more. Feature squeezing is omitted here — the bench table shows it does not survive an adaptive attacker."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 h-80 w-full",
				children: data.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
						data,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, { stroke: "var(--color-line)" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "eps",
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								domain: [0, 1],
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								formatter: (value) => pct(Number(value)),
								contentStyle: {
									background: "var(--color-surface)",
									border: "1px solid var(--color-line)",
									borderRadius: "8px"
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "monotone",
								dataKey: "Forest",
								stroke: "var(--color-muted)",
								strokeWidth: 2,
								dot: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "monotone",
								dataKey: "Network",
								stroke: "var(--color-danger)",
								strokeWidth: 2,
								dot: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "monotone",
								dataKey: "Adv. train",
								stroke: "var(--color-ink)",
								strokeWidth: 2,
								dot: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "monotone",
								dataKey: "Hybrid",
								stroke: "var(--color-accent)",
								strokeWidth: 3,
								dot: false
							})
						]
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: phase === "running" ? "Scoring the sweep…" : "Train the bench to draw the curve."
				})
			})
		]
	});
}
function FlowsView({ flows, epsilon, attack, phase }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-3xl",
				children: "Perturbed intrusion flows"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: [
					"White-box ",
					attack.toUpperCase(),
					" at ε = ",
					epsilon.toFixed(2),
					" on the network. Hybrid is the defended committee on its own adaptive attack, not a copy of the network’s example."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 overflow-x-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[36rem] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-line text-xs tracking-wide text-muted uppercase",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-3 font-medium",
								children: "Family"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-3 font-medium",
								children: "Network clean"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-3 font-medium",
								children: "Network attacked"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-3 font-medium",
								children: "Hybrid"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-3 font-medium",
								children: "Largest move"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: flows?.map((flow) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-3 font-medium",
								children: FAMILY[flow.family]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-3",
								children: flow.clean === 1 ? "Attack" : "Miss"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-3 " + (flow.clean === 1 && flow.adv === 0 ? "text-danger" : ""),
								children: flow.adv === 1 ? "Attack" : "Evaded"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-3 " + (flow.hybrid === 1 ? "text-safe" : "text-danger"),
								children: flow.hybrid === 1 ? "Caught" : "Missed"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-2 py-3 tabular-nums",
								children: [
									flow.feature,
									" ",
									flow.delta >= 0 ? "+" : "",
									flow.delta.toFixed(3)
								]
							})
						]
					}, flow.id)) })]
				}), !flows ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-6 text-sm text-muted",
					children: phase === "running" ? "Waiting for scores." : "No flows yet."
				}) : null]
			})
		]
	});
}
function MethodView() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-lg border border-line bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl",
					children: "What this bench actually does"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Stratified split of flows into train and test, by attack family. Encoders and scalers are fit on the training split only." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Clean baselines in Python: a scikit-learn random forest, a scikit-learn linear SVC with train-only standardization, and a PyTorch network with two ReLU layers trained by Adam." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Evasion attacks on intrusion rows only, inside an L∞ ball on features scaled to [0, 1]. FGSM is one signed gradient step. PGD iterates, projects back into the ε-ball, and clips to valid bounds." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Gradients come from the PyTorch network. The forest and the SVM are not differentiated; they are scored on examples transferred from that network. Non-adaptive attacks are generated with ART’s FGSM and PGD. The signed step is the CleverHans / Goodfellow update." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Defenses: feature squeezing fit on clean training ranges, Madry-style adversarial training, and a forest plus SVM refit on PGD-augmented intrusions." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Hybrid rule: squeeze the input, then alert if the robust network alerts, or if the defended forest and SVM both alert. The attacker is adaptive and uses a straight-through estimate through the squeeze." })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-lg border border-line bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl",
					children: "Robustness score"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm",
					children: "ASRS = 0.10·r(0.05) + 0.20·r(0.10) + 0.30·r(0.20) + 0.40·r(0.30), where r(ε) = min(1, F1 at ε / clean F1). A score of 1 means no F1 loss across that sweep. Attack success rate is separate: among intrusions the clean model already caught, the share the attack flips to benign."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-lg border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-3xl",
						children: "Data, and what it is not"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm",
						children: "NSL-KDD ships as a fixed stratified subsample of the real KDDTrain+ file (720 normal, 480 DoS, 300 probe, 220 R2L, all 52 U2R). Bytes and counts are scaled into [0, 1]. CICIDS2017 and UNSW-NB15 stay in scenario mode until the real CSV or text files are placed in datasets/raw — the bench then loads those files, encodes categories, and scales from the training split only. The same Python training, attack, and scoring path runs for every dataset."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "These are feature-space attacks. Not every perturbed coordinate is a legal packet. U2R has 52 source rows, so its rate is noisy. Feature squeezing alone does not hold once the attacker knows about it. Hybrid trades a little clean precision for a much lower evasion rate."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-lg border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-3xl",
						children: "Team"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 flex flex-col gap-2 text-sm",
						children: TEAM.map((person) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex flex-wrap justify-between gap-2 border-b border-line pb-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium",
								children: person.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted tabular-nums",
								children: person.roll
							})]
						}, person.roll))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: "Koneru Lakshmaiah Education Foundation · Department of Computer Science and Engineering · Engineering Capstone Project I."
					})
				]
			})
		]
	});
}
function SurveyView() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "rounded-lg border border-line bg-surface p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl",
					children: "Research literature matrix"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Six papers that frame the gap this bench is built to close. Venue names follow the capstone survey. Use the anchors below when a DOI needs to be checked."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 flex flex-col gap-3",
					children: SURVEY.map((paper) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "rounded-lg border border-line bg-bg p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs tracking-wide text-muted uppercase",
								children: [
									paper.year,
									" · ",
									paper.venue
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "mt-1 text-2xl",
								children: paper.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: paper.authors
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "mt-2 grid gap-2 text-sm md:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-xs tracking-wide text-muted uppercase",
										children: "Techniques"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: paper.techniques })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-xs tracking-wide text-muted uppercase",
										children: "Dataset"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: paper.dataset })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-xs tracking-wide text-muted uppercase",
										children: "Finding"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: paper.finding })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-xs tracking-wide text-muted uppercase",
										children: "Gap this bench targets"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: paper.gap })] })
								]
							})
						]
					}, paper.title))
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "rounded-lg border border-line bg-surface p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-3xl",
				children: "Anchors"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 flex flex-col gap-3 text-sm",
				children: ANCHORS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					className: "underline decoration-line underline-offset-2",
					href: item.href,
					children: item.ref
				}) }, item.href))
			})]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldApp, {});
}
//#endregion
export { Home as component };
