export type ActivityDuplicateCandidate = {
  userId: string;
  source: string;
  type: string;
  startDate: Date | string;
  movingTime: number;
  distance: number;
};

export function isLikelyDuplicate(
  a: ActivityDuplicateCandidate,
  b: ActivityDuplicateCandidate
): boolean {
  if (a.userId !== b.userId) return false;
  if (a.source === b.source) return false;
  if (a.type !== b.type) return false;

  const startA = new Date(a.startDate).getTime();
  const startB = new Date(b.startDate).getTime();

  if (!Number.isFinite(startA) || !Number.isFinite(startB)) {
    return false;
  }

  if (
    !Number.isFinite(a.movingTime) ||
    !Number.isFinite(b.movingTime) ||
    !Number.isFinite(a.distance) ||
    !Number.isFinite(b.distance) ||
    a.movingTime <= 0 ||
    b.movingTime <= 0 ||
    a.distance <= 0 ||
    b.distance <= 0
  ) {
    return false;
  }

  const startDifference = Math.abs(startA - startB) / 1000;
  const durationDifference = Math.abs(a.movingTime - b.movingTime);
  const distanceDifference = Math.abs(a.distance - b.distance);

  const durationTolerance = Math.min(
    120,
    Math.max(a.movingTime, b.movingTime) * 0.03
  );

  const distanceTolerance = Math.min(
    300,
    Math.max(a.distance, b.distance) * 0.03
  );

  return (
    startDifference <= 120 &&
    durationDifference <= durationTolerance &&
    distanceDifference <= distanceTolerance
  );
}