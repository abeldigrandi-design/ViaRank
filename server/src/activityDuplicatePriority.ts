export type ActivityPriorityCandidate = {
  id: string;
  source: string;
  createdAt: Date | string;
};

export function choosePrimaryActivity<
  T extends ActivityPriorityCandidate
>(a: T, b: T): T {
  if (a.source === "VIARANK" && b.source !== "VIARANK") {
    return a;
  }

  if (b.source === "VIARANK" && a.source !== "VIARANK") {
    return b;
  }

  const timeA = new Date(a.createdAt).getTime();
  const timeB = new Date(b.createdAt).getTime();

  if (Number.isFinite(timeA) && Number.isFinite(timeB)) {
    if (timeA < timeB) return a;
    if (timeB < timeA) return b;
  }

  return a.id <= b.id ? a : b;
}