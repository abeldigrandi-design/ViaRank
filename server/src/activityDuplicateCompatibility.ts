export type DuplicateCompatibilityActivity = {
  id: string;
  userId: string;
  source: string;
  type: string;
  startDate: Date | string;
  distance: number;
  movingTime: number;
};

export function areActivitiesCompatible(
  a: DuplicateCompatibilityActivity,
  b: DuplicateCompatibilityActivity
): boolean {
  if (a.id === b.id) return false;
  if (a.userId !== b.userId) return false;
  if (a.source === b.source) return false;
  if (a.type !== b.type) return false;

  const startA = new Date(a.startDate).getTime();
  const startB = new Date(b.startDate).getTime();

  if (!Number.isFinite(startA) || !Number.isFinite(startB)) {
    return false;
  }

  if (Math.abs(startA - startB) > 120000) {
    return false;
  }

  if (
    !Number.isFinite(a.distance) ||
    !Number.isFinite(b.distance) ||
    !Number.isFinite(a.movingTime) ||
    !Number.isFinite(b.movingTime) ||
    a.distance <= 0 ||
    b.distance <= 0 ||
    a.movingTime <= 0 ||
    b.movingTime <= 0
  ) {
    return false;
  }

  const distanceTolerance = Math.min(
    300,
    Math.max(a.distance, b.distance) * 0.03
  );

  const durationTolerance = Math.min(
    120,
    Math.max(a.movingTime, b.movingTime) * 0.03
  );

  return (
    Math.abs(a.distance - b.distance) <= distanceTolerance &&
    Math.abs(a.movingTime - b.movingTime) <= durationTolerance
  );
}