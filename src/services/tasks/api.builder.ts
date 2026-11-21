import { Effect, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import { AppApi } from "@/api";
import { isDatastar, sse } from "@/lib/browser";
import { patchElements } from "@/lib/datastar";
import { PlannerFeedback } from "@/routes/components/feedback";
import { renderDocument } from "@/routes/document";
import { renderDashboard } from "@/routes/workouts";
import { loadDashboard } from "@/services/planner/dashboard";
import { readOptions, viewUrl } from "@/services/workouts/helpers";
import { Tasks } from "./index";
import {
  decodeTaskCompletion,
  decodeTaskForm,
  TaskDate,
  type Task,
} from "./schema";
import { TaskForm } from "./components/form";

const internalServerError = () => new HttpApiError.InternalServerError({});
const formResponse = (
  values: Record<string, string>,
  task?: Task,
  error?: string,
  status = 200,
) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const options = readOptions(values);
    const form = TaskForm({ options, values, task, error });
    if (isDatastar(request)) return sse([patchElements(form)]);
    return HttpServerResponse.text(
      renderDocument(
        renderDashboard(
          yield* loadDashboard(options),
          options,
          undefined,
          undefined,
          undefined,
          form,
        ),
      ).value,
      { status, contentType: "text/html" },
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
      feedback("The task could not be loaded or saved. Please try again.", 500),
    ),
  );
const edit = (values: Record<string, string>) =>
  Effect.gen(function* () {
    const tasks = yield* Tasks;
    const task = values.edit
      ? yield* tasks.get({ id: values.edit })
      : undefined;
    if (values.edit && !task) return yield* feedback("Task not found.", 404);
    return yield* formResponse(values, task);
  });
const save = (values: Record<string, string>, id?: string) =>
  Effect.gen(function* () {
    const tasks = yield* Tasks;
    const task = id ? yield* tasks.get({ id }) : undefined;
    if (id && !task) return yield* feedback("Task not found.", 404);
    const decoded = yield* decodeTaskForm(values).pipe(Effect.result);
    if (decoded._tag === "Failure")
      return yield* formResponse(
        values,
        task,
        "Enter a title (up to 200 characters), a valid date or no date, and notes up to 2,000 characters.",
        400,
      );
    const saved = yield* (
      id
        ? tasks.update({ id, payload: decoded.success })
        : tasks.create({ payload: decoded.success })
    ).pipe(Effect.result);
    if (saved._tag === "Failure") {
      yield* Effect.logError(saved.failure);
      return yield* formResponse(
        values,
        task,
        "The task could not be saved. Please try again.",
        500,
      );
    }
    if (!saved.success) return yield* feedback("Task not found.", 404);
    return yield* refresh(values);
  });
const complete = (id: string, values: Record<string, string>) =>
  Effect.gen(function* () {
    const decoded = yield* decodeTaskCompletion(values).pipe(Effect.result);
    if (decoded._tag === "Failure")
      return yield* feedback("Invalid task completion.", 400);
    const tasks = yield* Tasks;
    if (!(yield* tasks.setCompletion({ id, payload: decoded.success })))
      return yield* feedback("Task not found.", 404);
    return yield* refresh(values);
  });
const remove = (id: string, values: Record<string, string>) =>
  Effect.gen(function* () {
    const tasks = yield* Tasks;
    if (!(yield* tasks.remove({ id })))
      return yield* feedback("Task not found.", 404);
    return yield* refresh(values);
  });

export const tasksHandler = HttpApiBuilder.group(AppApi, "tasks", (handlers) =>
  handlers
    .handle("listTasks", () =>
      Effect.gen(function* () {
        const tasks = yield* Tasks;
        return yield* tasks.list({}).pipe(Effect.mapError(internalServerError));
      }),
    )
    .handle("createTask", ({ payload }) =>
      Effect.gen(function* () {
        const tasks = yield* Tasks;
        return yield* tasks
          .create({ payload })
          .pipe(Effect.mapError(internalServerError));
      }),
    )
    .handle("updateTask", ({ params, payload }) =>
      Effect.gen(function* () {
        const tasks = yield* Tasks;
        const task = yield* tasks
          .update({ id: params.id, payload })
          .pipe(Effect.mapError(internalServerError));
        if (!task) return yield* new HttpApiError.NotFound({});
        return task;
      }),
    )
    .handle("completeTask", ({ params, payload }) =>
      Effect.gen(function* () {
        const tasks = yield* Tasks;
        const task = yield* tasks
          .setCompletion({ id: params.id, payload })
          .pipe(Effect.mapError(internalServerError));
        if (!task) return yield* new HttpApiError.NotFound({});
        return task;
      }),
    )
    .handle("deleteTask", ({ params }) =>
      Effect.gen(function* () {
        const tasks = yield* Tasks;
        if (
          !(yield* tasks
            .remove(params)
            .pipe(Effect.mapError(internalServerError)))
        )
          return yield* new HttpApiError.NotFound({});
      }),
    )
    .handle("new", ({ query }) =>
      edit({
        ...query,
        ...(Schema.is(TaskDate)(query.new) ? { date: query.new } : {}),
      }).pipe(Effect.catch(browserError)),
    )
    .handle("create", ({ payload }) =>
      save(payload).pipe(Effect.catch(browserError)),
    )
    .handle("update", ({ params, payload }) =>
      save(payload, params.id).pipe(Effect.catch(browserError)),
    )
    .handle("complete", ({ params, payload }) =>
      complete(params.id, payload).pipe(Effect.catch(browserError)),
    )
    .handle("delete", ({ params, payload }) =>
      remove(params.id, payload).pipe(Effect.catch(browserError)),
    ),
);
