import { HttpApi, OpenApi } from "effect/http-api";

import { WorkoutsApiGroup } from "@/services/workouts/api.group";
import { HabitsApiGroup } from "@/services/habits/api.group";
import { TimelineApiGroup } from "@/services/timeline/api.group";
import { TasksApiGroup } from "@/services/tasks/api.group";
import { GoalsApiGroup } from "@/services/goals/api.group";
import { PlannerApiGroup } from "@/services/planner/api.group";

export const AppApi = HttpApi.make("AppApi")
  .annotateMerge(
    OpenApi.annotations({
      title: "Life Planner API",
      version: "1.0.0",
      description: "Local tasks, workouts, training plans, and daily habits.",
    }),
  )
  .add(WorkoutsApiGroup)
  .add(HabitsApiGroup)
  .add(TasksApiGroup)
  .add(GoalsApiGroup)
  .add(PlannerApiGroup)
  .add(TimelineApiGroup);
