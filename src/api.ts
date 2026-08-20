import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { HealthApiGroup } from "@krak-stack/registry/service-health";

import { WorkoutsApiGroup } from "@/services/workouts/api.group";

export const AppApi = HttpApi.make("AppApi")
  .annotateMerge(
    OpenApi.annotations({
      title: "Training Ledger API",
      version: "1.0.0",
      description: "Local Apple Health workouts and training plans.",
    }),
  )
  .add(WorkoutsApiGroup)
  .add(HealthApiGroup)
  .prefix("/api");
