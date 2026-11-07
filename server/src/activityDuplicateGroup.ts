import {
  choosePrimaryActivity,
  type ActivityPriorityCandidate,
} from "./activityDuplicatePriority.js";

export type DuplicateGroupResult<T> = {
  primary: T;
  duplicates: Array<{
    activity: T;
    duplicateOfId: string;
  }>;
};

export function organizeConfirmedDuplicates<
  T extends ActivityPriorityCandidate
>(activities: T[]): DuplicateGroupResult<T> {
  if (activities.length === 0) {
    throw new Error("No hay actividades para organizar");
  }

  const ids = new Set(activities.map((activity) => activity.id));

  if (ids.size !== activities.length) {
    throw new Error("Hay identificadores de actividad repetidos");
  }

  const sources = activities.map((activity) => activity.source);

  if (new Set(sources).size !== sources.length) {
    throw new Error(
      "No se pueden agrupar dos actividades de la misma fuente"
    );
  }

  const primary = activities.reduce((a, b) =>
    choosePrimaryActivity(a, b)
  );

  const duplicates = activities
    .filter((activity) => activity.id !== primary.id)
    .map((activity) => ({
      activity,
      duplicateOfId: primary.id,
    }));

  return { primary, duplicates };
}