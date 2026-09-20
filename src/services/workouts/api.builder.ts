import { Effect } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { AppApi } from "@/api";
import { patchElements } from "@/lib/datastar";
import { renderDashboard, type DashboardData } from "@/routes/workouts";
import { renderDocument } from "@/routes/document";
import { renderLoadError } from "@/routes/error";
import { Workouts } from "./index";
import { decodeWorkoutForm, type WorkoutDataError } from "./schema";
import { WorkoutForm } from "./components/form";
import { readOptions, viewUrl, workoutsCsv, type ViewOptions } from "./helpers";

const isDatastar = (request: HttpServerRequest.HttpServerRequest) =>
  request.headers["datastar-request"] === "true";
const sse = (events: ReadonlyArray<string>) =>
  HttpServerResponse.text(events.join(""), {
    contentType: "text/event-stream",
    headers: { "Cache-Control": "no-cache" },
  });

const loadDashboard = (
  options: ViewOptions,
): Effect.Effect<DashboardData, WorkoutDataError, Workouts> =>
  Effect.gen(function* () {
    const service = yield* Workouts;
    switch (options.view) {
      case "overview":
        return {
          view: "overview",
          overview: yield* service.overview({
            activityType:
              options.activity === "cycling" ? "Cycling" : "Running",
          }),
        };
      case "calendar":
        return {
          view: "calendar",
          schedule: yield* service.schedule({ month: options.month }),
        };
      case "week":
        return {
          view: "week",
          schedule: yield* service.schedule({
            search: options.search,
            sort: options.sort,
          }),
        };
      default:
        return {
          view: "table",
          page: yield* service.search({
            search: options.search,
            sort: options.sort,
            page: options.page,
          }),
        };
    }
  });

const page = (query: Record<string, string>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const options = readOptions(query);
    const service = yield* Workouts;
    const edit = query.edit;
    const workout = edit ? yield* service.get({ id: edit }) : undefined;
    if (edit && !workout)
      return HttpServerResponse.text("Workout not found", { status: 404 });
    const initialDate = query.new ?? "";
    const form =
      workout || initialDate
        ? WorkoutForm({
            options,
            workout,
            initialDate:
              /^\d{4}-\d{2}-\d{2}$/.test(initialDate) &&
              Number.isFinite(Date.parse(initialDate))
                ? initialDate
                : undefined,
          })
        : undefined;
    if (isDatastar(request) && form) return sse([patchElements(form)]);
    const data = yield* loadDashboard(options);
    return HttpServerResponse.html(
      renderDocument(renderDashboard(data, options, form)).value,
    );
  }).pipe(
    Effect.catch((error) =>
      Effect.logError(error).pipe(
        Effect.as(
          HttpServerResponse.text(renderLoadError().value, {
            status: 500,
            contentType: "text/html",
          }),
        ),
      ),
    ),
  );

const save = (values: Record<string, string>, id?: string) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const options = readOptions(values);
    const service = yield* Workouts;
    const workout = id ? yield* service.get({ id }) : undefined;
    if (id && !workout)
      return HttpServerResponse.text("Workout not found", { status: 404 });
    const feedback = (message: string, status: number) =>
      Effect.gen(function* () {
        const form = WorkoutForm({ options, workout, error: message, values });
        if (isDatastar(request)) return sse([patchElements(form)]);
        const data = yield* loadDashboard(options);
        return HttpServerResponse.text(
          renderDocument(renderDashboard(data, options, form)).value,
          { status, contentType: "text/html" },
        );
      });
    const decoded = yield* decodeWorkoutForm(values).pipe(Effect.result);
    if (decoded._tag === "Failure")
      return yield* feedback(
        "Enter an activity, valid date, non-negative distance, and a duration greater than zero.",
        400,
      );
    const saved = yield* (
      id
        ? service.update({ id, payload: decoded.success })
        : service.create(decoded.success)
    ).pipe(Effect.result);
    if (saved._tag === "Failure") {
      yield* Effect.logError(saved.failure);
      return yield* feedback(
        "The workout could not be saved. Please try again.",
        500,
      );
    }
    if (!saved.success) return yield* feedback("Workout not found.", 404);
    if (!isDatastar(request))
      return HttpServerResponse.redirect(viewUrl(options), { status: 303 });
    const data = yield* loadDashboard(options);
    return sse([patchElements(renderDashboard(data, options))]);
  }).pipe(
    Effect.catch((error) =>
      Effect.logError(error).pipe(
        Effect.as(
          HttpServerResponse.text("The workout could not be saved.", {
            status: 500,
          }),
        ),
      ),
    ),
  );

const exportCsv = (query: Record<string, string>) =>
  Effect.gen(function* () {
    const options = readOptions(query);
    const service = yield* Workouts;
    const { workouts } = yield* service.search({
      search: options.search,
      sort: options.sort,
      week: options.view === "week",
      pageSize: null,
    });
    return HttpServerResponse.text(workoutsCsv(workouts), {
      contentType: "text/csv",
      headers: {
        "Content-Disposition":
          'attachment; filename="apple-health-workouts.csv"',
      },
    });
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(
        HttpServerResponse.text("Workout data could not be loaded.", {
          status: 500,
        }),
      ),
    ),
  );

const internalServerError = () => new HttpApiError.InternalServerError({});

export const workoutsHandler = HttpApiBuilder.group(
  AppApi,
  "workouts",
  (handlers) =>
    handlers
      .handle("listWorkouts", ({ query }) =>
        Effect.gen(function* () {
          const workouts = yield* Workouts;
          return yield* workouts
            .list(query)
            .pipe(Effect.mapError(internalServerError));
        }),
      )
      .handle("createWorkout", ({ payload }) =>
        Effect.gen(function* () {
          const workouts = yield* Workouts;
          return yield* workouts
            .create(payload)
            .pipe(Effect.mapError(internalServerError));
        }),
      )
      .handle("updateWorkout", ({ params, payload }) =>
        Effect.gen(function* () {
          const workouts = yield* Workouts;
          const workout = yield* workouts
            .update({ id: params.id, payload })
            .pipe(Effect.mapError(internalServerError));
          if (!workout) return yield* new HttpApiError.NotFound({});
          return workout;
        }),
      )
      .handle("summarizeWorkouts", ({ query }) =>
        Effect.gen(function* () {
          const workouts = yield* Workouts;
          return yield* workouts
            .summary(query)
            .pipe(Effect.mapError(internalServerError));
        }),
      )
      .handle("home", () =>
        Effect.succeed(
          HttpServerResponse.redirect("/workouts", { status: 303 }),
        ),
      )
      .handle("page", ({ query }) => page(query))
      .handle("exportCsv", ({ query }) => exportCsv(query))
      .handle("create", ({ payload }) => save(payload))
      .handle("update", ({ params, payload }) => save(payload, params.id)),
);
