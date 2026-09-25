import { Effect, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { AppApi } from "@/api";
import { isDatastar, sse } from "@/lib/browser";
import { patchElements } from "@/lib/datastar";
import { PlannerFeedback } from "@/routes/components/feedback";
import { renderDocument } from "@/routes/document";
import { renderDashboard } from "@/routes/workouts";
import { loadDashboard } from "@/services/planner/dashboard";
import { readOptions, viewUrl } from "@/services/workouts/helpers";
import { Habits } from "./index";
import {
  decodeCompletionForm,
  decodeHabitForm,
  HabitDate,
  type Habit,
} from "./schema";
import { HabitForm } from "./components/form";

const internalServerError = () => new HttpApiError.InternalServerError({});

const formResponse = (
  values: Record<string, string>,
  error?: string,
  status = 200,
  habit?: Habit,
) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const options = readOptions(values);
    const form = HabitForm({ options, values, error, habit });
    if (isDatastar(request)) return sse([patchElements(form)]);
    const data = yield* loadDashboard(options);
    return HttpServerResponse.text(
      renderDocument(renderDashboard(data, options, undefined, form)).value,
      {
        status,
        contentType: "text/html",
      },
    );
  });

const refresh = (values: Record<string, string>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const options = readOptions(values);
    if (!isDatastar(request))
      return HttpServerResponse.redirect(viewUrl(options), { status: 303 });
    return sse([
      patchElements(renderDashboard(yield* loadDashboard(options), options)),
    ]);
  });

const create = (values: Record<string, string>) =>
  Effect.gen(function* () {
    const decoded = yield* decodeHabitForm(values).pipe(Effect.result);
    if (decoded._tag === "Failure")
      return yield* formResponse(
        values,
        "Enter a habit name (up to 100 characters), a valid start date, and notes up to 2,000 characters.",
        400,
      );
    const habits = yield* Habits;
    const saved = yield* habits
      .create({ payload: decoded.success })
      .pipe(Effect.result);
    if (saved._tag === "Failure") {
      yield* Effect.logError(saved.failure);
      return yield* formResponse(
        values,
        "The habit could not be created. Please try again.",
        500,
      );
    }
    return yield* refresh(values);
  });

const edit = (values: Record<string, string>) =>
  Effect.gen(function* () {
    const id = values.edit;
    if (!id) return yield* formResponse(values);
    const habits = yield* Habits;
    const habit = yield* habits.get({ id });
    if (!habit)
      return HttpServerResponse.text("Habit not found", { status: 404 });
    return yield* formResponse(values, undefined, 200, habit);
  });

const update = (id: string, values: Record<string, string>) =>
  Effect.gen(function* () {
    const habits = yield* Habits;
    const habit = yield* habits.get({ id });
    if (!habit)
      return HttpServerResponse.text("Habit not found", { status: 404 });
    const decoded = yield* decodeHabitForm(values).pipe(Effect.result);
    if (decoded._tag === "Failure")
      return yield* formResponse(
        values,
        "Enter a habit name (up to 100 characters), a valid start date, and notes up to 2,000 characters.",
        400,
        habit,
      );
    const saved = yield* habits
      .update({ id, payload: decoded.success })
      .pipe(Effect.result);
    if (saved._tag === "Failure") {
      yield* Effect.logError(saved.failure);
      return yield* formResponse(
        values,
        "The habit could not be saved. Please try again.",
        500,
        habit,
      );
    }
    if (!saved.success)
      return HttpServerResponse.text("Habit not found", { status: 404 });
    return yield* refresh(values);
  });

const completionError = (message: string, status: number) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    if (isDatastar(request))
      return sse([patchElements(PlannerFeedback({ message }))]);
    return HttpServerResponse.text(message, { status });
  });

const complete = (id: string, values: Record<string, string>) =>
  Effect.gen(function* () {
    const decoded = yield* decodeCompletionForm(values).pipe(Effect.result);
    if (decoded._tag === "Failure")
      return yield* completionError("Invalid habit completion.", 400);
    const habits = yield* Habits;
    const result = yield* habits
      .setCompletion({ id, payload: decoded.success })
      .pipe(Effect.result);
    if (result._tag === "Failure") {
      yield* Effect.logError(result.failure);
      return yield* completionError(
        "The habit could not be updated. Please try again.",
        500,
      );
    }
    if (!result.success)
      return yield* completionError("Habit not found for this day.", 404);
    return yield* refresh(values);
  });

const remove = (id: string, values: Record<string, string>) =>
  Effect.gen(function* () {
    const habits = yield* Habits;
    const removed = yield* habits.remove({ id });
    if (!removed) return yield* completionError("Habit not found.", 404);
    return yield* refresh(values);
  }).pipe(
    Effect.catch((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(error);
        return yield* completionError(
          "The habit could not be deleted. Please try again.",
          500,
        );
      }),
    ),
  );

const browserError = (error: unknown) =>
  Effect.logError(error).pipe(
    Effect.as(
      HttpServerResponse.text(
        "The habit could not be loaded or saved. Please try again.",
        { status: 500 },
      ),
    ),
  );

export const habitsHandler = HttpApiBuilder.group(
  AppApi,
  "habits",
  (handlers) =>
    handlers
      .handle("deleteHabit", ({ params }) =>
        Effect.gen(function* () {
          const habits = yield* Habits;
          const removed = yield* habits
            .remove(params)
            .pipe(Effect.mapError(internalServerError));
          if (!removed) return yield* new HttpApiError.NotFound({});
        }),
      )
      .handle("delete", ({ params, payload }) => remove(params.id, payload))
      .handle("listHabits", () =>
        Effect.gen(function* () {
          const habits = yield* Habits;
          return yield* habits
            .list({})
            .pipe(Effect.mapError(internalServerError));
        }),
      )
      .handle("createHabit", ({ payload }) =>
        Effect.gen(function* () {
          const habits = yield* Habits;
          return yield* habits
            .create({ payload })
            .pipe(Effect.mapError(internalServerError));
        }),
      )
      .handle("updateHabit", ({ params, payload }) =>
        Effect.gen(function* () {
          const habits = yield* Habits;
          const habit = yield* habits
            .update({ id: params.id, payload })
            .pipe(Effect.mapError(internalServerError));
          if (!habit) return yield* new HttpApiError.NotFound({});
          return habit;
        }),
      )
      .handle("completeHabit", ({ params, payload }) =>
        Effect.gen(function* () {
          const habits = yield* Habits;
          const completion = yield* habits
            .setCompletion({ id: params.id, payload })
            .pipe(Effect.mapError(internalServerError));
          if (!completion) return yield* new HttpApiError.NotFound({});
          return completion;
        }),
      )
      .handle("new", ({ query }) =>
        edit({
          ...query,
          ...(Schema.is(HabitDate)(query.new) ? { startDate: query.new } : {}),
        }).pipe(Effect.catch(browserError)),
      )
      .handle("create", ({ payload }) =>
        create(payload).pipe(Effect.catch(browserError)),
      )
      .handle("update", ({ params, payload }) =>
        update(params.id, payload).pipe(Effect.catch(browserError)),
      )
      .handle("complete", ({ params, payload }) =>
        complete(params.id, payload).pipe(Effect.catch(browserError)),
      ),
);
