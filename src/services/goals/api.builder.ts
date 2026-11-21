import { Effect } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { AppApi } from "@/api";
import { isDatastar, sse } from "@/lib/browser";
import { patchElements } from "@/lib/datastar";
import { PlannerFeedback } from "@/routes/components/feedback";
import { renderDocument } from "@/routes/document";
import { renderDashboard } from "@/routes/workouts";
import { loadDashboard } from "@/services/planner/dashboard";
import { readOptions } from "@/services/workouts/helpers";
import { Goals } from "./index";
import { decodeGoalForm, type Goal } from "./schema";
import { PersonalGoalForm } from "./components/form";

const options = readOptions({ view: "dashboard" });
const showForm = (
  values: Record<string, string>,
  goal?: Goal,
  error?: string,
  status = 200,
) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const form = PersonalGoalForm({ values, goal, error });
    if (isDatastar(request)) return sse([patchElements(form)]);
    const page = renderDashboard(
      yield* loadDashboard(options),
      options,
      undefined,
      undefined,
      undefined,
      undefined,
      form,
    );
    return HttpServerResponse.text(renderDocument(page).value, {
      status,
      contentType: "text/html",
    });
  });
const refresh = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  if (!isDatastar(request))
    return HttpServerResponse.redirect("/", { status: 303 });
  return sse([
    patchElements(renderDashboard(yield* loadDashboard(options), options)),
  ]);
});
const feedback = (message: string, status: number) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    if (isDatastar(request))
      return sse([patchElements(PlannerFeedback({ message }))]);
    return HttpServerResponse.text(message, { status });
  });
const browserError = (error: unknown) =>
  Effect.logError(error).pipe(
    Effect.andThen(
      feedback("Could not load or save the goal. Please try again.", 500),
    ),
  );
const notFound = feedback("Goal not found.", 404);

const save = (values: Record<string, string>, id?: string) =>
  Effect.gen(function* () {
    const goals = yield* Goals;
    const decoded = yield* decodeGoalForm(values).pipe(Effect.result);
    if (decoded._tag === "Failure") {
      const goal = id ? yield* goals.get({ id }) : undefined;
      if (id && !goal) return yield* notFound;
      return yield* showForm(
        values,
        goal,
        "Enter a goal (up to 200 characters), a valid status, and notes up to 2,000 characters.",
        400,
      );
    }
    const saved = yield* id
      ? goals.update({ id, payload: decoded.success })
      : goals.create({ payload: decoded.success });
    return yield* saved ? refresh : notFound;
  });

export const goalsHandler = HttpApiBuilder.group(AppApi, "goals", (handlers) =>
  handlers
    .handle("form", ({ query }) =>
      Effect.gen(function* () {
        const goals = yield* Goals;
        const goal = query.edit
          ? yield* goals.get({ id: query.edit })
          : undefined;
        if (query.edit && !goal) return yield* notFound;
        return yield* showForm({}, goal);
      }).pipe(Effect.catch(browserError)),
    )
    .handle("create", ({ payload }) =>
      save(payload).pipe(Effect.catch(browserError)),
    )
    .handle("update", ({ params, payload }) =>
      save(payload, params.id).pipe(Effect.catch(browserError)),
    )
    .handle("delete", ({ params }) =>
      Effect.gen(function* () {
        const goals = yield* Goals;
        return yield* (yield* goals.remove(params)) ? refresh : notFound;
      }).pipe(Effect.catch(browserError)),
    ),
);
