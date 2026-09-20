import { HttpApi, OpenApi } from "effect/unstable/httpapi";

import { WorkoutsApiGroup } from "@/services/workouts/api.group";

export const AppApi = HttpApi.make("AppApi")
  .annotateMerge(
    OpenApi.annotations({
      title: "Training Ledger API",
      version: "1.0.0",
      description: "Local Apple Health workouts and training plans.",
    }),
  )
  .add(WorkoutsApiGroup);
