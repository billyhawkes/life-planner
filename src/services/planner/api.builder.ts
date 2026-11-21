import { Effect, Option, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { AppApi } from "@/api";
import { isDatastar, sse } from "@/lib/browser";
import { patchElements } from "@/lib/datastar";
import { renderDocument } from "@/routes/document";
import { renderLoadError } from "@/routes/error";
import { renderDashboard } from "@/routes/workouts";
import { Workouts } from "@/services/workouts";
import { WorkoutForm } from "@/services/workouts/components/form";
import { HealthImportForm } from "@/services/workouts/components/import-form";
import { readOptions } from "@/services/workouts/helpers";
import { HealthImportStats } from "@/services/workouts/schema";
import { loadDashboard } from "./dashboard";

export const plannerPage = (query: Record<string, string>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const options = readOptions(query);
    const service = yield* Workouts;
    const edit = query.edit;
    const workout = edit ? yield* service.get({ id: edit }) : undefined;
    if (edit && !workout)
      return HttpServerResponse.text("Workout not found", { status: 404 });
    const initialDate = query.new ?? "";
    const stats = Option.getOrUndefined(
      Schema.decodeUnknownOption(HealthImportStats)(query),
    );
    const form =
      query.import === "true" || stats !== undefined
        ? HealthImportForm({ options, stats })
        : workout || initialDate
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

export const plannerHandler = HttpApiBuilder.group(
  AppApi,
  "planner",
  (handlers) =>
    handlers
      .handle("dashboard", ({ query }) =>
        plannerPage({ ...query, view: "dashboard" }),
      )
      .handle("today", ({ query }) => plannerPage({ ...query, view: "today" }))
      .handle("week", ({ query }) => plannerPage({ ...query, view: "week" }))
      .handle("calendar", ({ query }) =>
        plannerPage({ ...query, view: "calendar" }),
      )
      .handle("stats", ({ query }) => plannerPage({ ...query, view: "stats" }))
      .handle("menu", ({ query }) => plannerPage({ ...query, view: "menu" })),
);
