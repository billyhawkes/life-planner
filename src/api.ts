import { HttpApi, OpenApi } from "effect/unstable/httpapi";

import { WorkoutsApiGroup } from "@/services/workouts/api.group";
import { HabitsApiGroup } from "@/services/habits/api.group";

export const AppApi = HttpApi.make("AppApi")
  .annotateMerge(
    OpenApi.annotations({
      title: "Life Planner API",
      version: "1.0.0",
      description: "Local workouts, training plans, and daily habits.",
    }),
  )
  .add(WorkoutsApiGroup)
  .add(HabitsApiGroup);
