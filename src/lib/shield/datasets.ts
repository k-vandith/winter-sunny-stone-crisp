export type DatasetId = "nsl-kdd" | "cicids2017" | "unsw-nb15";

export type DatasetInfo = {
  id: DatasetId;
  name: string;
  kind: "recorded" | "scenario";
  origin: string;
  summary: string;
  features?: readonly string[];
};

export const DATASET_FALLBACK: DatasetInfo[] = [
  {
    id: "nsl-kdd",
    name: "NSL-KDD",
    kind: "recorded",
    origin: "KDDTrain+ · University of New Brunswick",
    summary:
      "Stratified subsample of the real KDDTrain+ file: 720 normal, 480 DoS, 300 probe, 220 R2L, and all 52 U2R rows. Bytes and counts are scaled into [0, 1]; rates are unchanged.",
  },
  {
    id: "cicids2017",
    name: "CICIDS2017",
    kind: "scenario",
    origin: "Flow-feature scenario · CIC schema",
    summary:
      "Class-conditional flows on the CICIDS2017 numeric schema (duration, packet counts, SYN/ACK, window sizes). Same pipeline as NSL-KDD. Scenario mode — not the raw capture.",
  },
  {
    id: "unsw-nb15",
    name: "UNSW-NB15",
    kind: "scenario",
    origin: "Flow-feature scenario · UNSW schema",
    summary:
      "Class-conditional flows on the UNSW-NB15 schema (rate, TTL, load, connection counts). Used to check that the defense is not an NSL-KDD-only trick. Scenario mode — not the raw capture.",
  },
];
