export const SURVEY = [
  {
    year: "2020",
    authors: "Wang et al.",
    title: "Evasion Attacks against ML-based IDS",
    venue: "NDSS",
    objective: "Analyze evasion techniques",
    techniques: "GAN-based generation",
    dataset: "CICIDS2017",
    finding: "Adversarial samples cut accuracy by about 40%",
    gap: "Attack study only — no defense in the loop",
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
    gap: "No hybrid defense against transferred examples",
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
    gap: "No standard multi-intensity metric",
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
    gap: "Latency and resource cost not reported",
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
    gap: "Heavy compute, weak on sparse features",
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
    gap: "No defense against CW-style attacks",
  },
] as const;

export const ANCHORS = [
  {
    ref: "Goodfellow, Shlens, Szegedy. Explaining and Harnessing Adversarial Examples. ICLR, 2015.",
    href: "https://arxiv.org/abs/1412.6572",
  },
  {
    ref: "Madry, Makelov, Schmidt, Tsipras, Vladu. Towards Deep Learning Models Resistant to Adversarial Attacks. ICLR, 2018.",
    href: "https://arxiv.org/abs/1706.06083",
  },
  {
    ref: "Carlini, Wagner. Towards Evaluating the Robustness of Neural Networks. IEEE S&P, 2017.",
    href: "https://arxiv.org/abs/1608.04644",
  },
  {
    ref: "He, Kim, Asghar. Adversarial Machine Learning for Network Intrusion Detection Systems: A Comprehensive Survey. IEEE COMST, 2023. DOI 10.1109/COMST.2022.3233793.",
    href: "https://doi.org/10.1109/COMST.2022.3233793",
  },
  {
    ref: "NSL-KDD, Canadian Institute for Cybersecurity, University of New Brunswick.",
    href: "https://www.unb.ca/cic/datasets/nsl.html",
  },
] as const;

export const TEAM = [
  { name: "Kondoju Kartikeya Vandith Manohar", roll: "2320030299" },
  { name: "Anisetti Deepika", roll: "2320030378" },
  { name: "Siddamsetty Sandeep", roll: "2320030317" },
] as const;
