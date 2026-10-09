import { Effect } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import { AppApi } from "@/api";
import { isDatastar, sse } from "@/lib/browser";
import { patchElements } from "@/lib/datastar";
import { renderDocument } from "@/routes/document";
import { renderTimeline } from "@/routes/timeline";
import { renderDashboard } from "@/routes/workouts";
import { loadDashboard } from "@/services/planner/dashboard";
import { readOptions, viewUrl } from "@/services/workouts/helpers";
import { Timeline } from "./index";
import { selectedDay } from "./helpers";
import { decodeBlockForm, decodeLabelForm, TimelineError } from "./schema";
import { GoalForm } from "./components/goal-form";
import { BlockForm } from "./components/block-form";

const blockForm = (values: Record<string, string>) =>
  Effect.gen(function* () {
    const service = yield* Timeline;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const options = readOptions(values);
    const labels = yield* service.listLabels({});
    const blocks = yield* service.listBlocks({});
    const form = BlockForm({ labels, blocks, options, values });
    if (isDatastar(request)) return sse([patchElements(form)]);
    const body =
      values.planner === "true"
        ? renderDashboard(
            yield* loadDashboard(options),
            options,
            undefined,
            undefined,
            {
              values: { ...values, operation: "block", editBlock: values.edit },
            },
          )
        : renderTimeline({
            labels,
            blocks,
            day: selectedDay(values.day),
            values: { ...values, operation: "block", editBlock: values.edit },
          });
    return HttpServerResponse.text(renderDocument(body).value, {
      contentType: "text/html",
    });
  });

const goalForm = (values: Record<string, string>) =>
  Effect.gen(function* () {
    const service = yield* Timeline;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const options = readOptions(values);
    const form = GoalForm({
      labels: yield* service.listLabels({}),
      day: selectedDay(values.day),
      options,
      values,
    });
    if (isDatastar(request)) return sse([patchElements(form)]);
    const data = yield* loadDashboard(options);
    const body = data.timeline
      ? renderDashboard(data, options, undefined, undefined, {
          values: {
            ...values,
            operation: "label",
            editLabel: values.edit ?? "",
          },
        })
      : renderDashboard(data, options, form);
    return HttpServerResponse.text(renderDocument(body).value, {
      contentType: "text/html",
    });
  });

const page = (values: Record<string, string>, error?: string, status = 200) =>
  Effect.gen(function* () {
    const service = yield* Timeline;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const body =
      values.planner === "true"
        ? renderDashboard(
            yield* loadDashboard(readOptions(values)),
            readOptions(values),
            undefined,
            undefined,
            { error, values },
          )
        : renderTimeline({
            labels: yield* service.listLabels({}),
            blocks: yield* service.listBlocks({}),
            day: selectedDay(values.day),
            values,
            error,
          });
    return isDatastar(request)
      ? sse([patchElements(body)])
      : HttpServerResponse.text(renderDocument(body).value, {
          contentType: "text/html",
          status,
        });
  });
const mutate = (
  values: Record<string, string>,
  operation: string,
  id?: string,
) =>
  Effect.gen(function* () {
    const service = yield* Timeline;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const result = yield* Effect.gen(function* () {
      if (operation === "label") {
        const payload = yield* decodeLabelForm(values);
        yield* service.saveLabel({ id, payload });
      } else if (operation === "block") {
        const payload = yield* decodeBlockForm(values);
        yield* service.saveBlock({ id, payload });
      } else if (operation === "start")
        yield* service.start({ labelId: values.labelId ?? "" });
      else if (operation === "stop") yield* service.stop({ id: id ?? "" });
      else yield* service.removeBlock({ id: id ?? "" });
    }).pipe(Effect.result);
    if (result._tag === "Failure") {
      const message =
        result.failure instanceof TimelineError
          ? result.failure.message
          : "Check the label, daily goal (0–1440 minutes), weekly goal (0–10080 minutes), and start/end times. End must be after start.";
      return yield* page(
        {
          ...values,
          operation,
          ...(operation === "block" && id ? { editBlock: id } : {}),
          ...(operation === "label" ? { editLabel: id ?? "" } : {}),
        },
        message,
        400,
      );
    }
    return isDatastar(request)
      ? yield* page(
          values.planner === "true"
            ? {
                ...readOptions(values),
                planner: "true",
                day: selectedDay(values.day),
                page: String(readOptions(values).page),
              }
            : { day: selectedDay(values.day) },
        )
      : HttpServerResponse.redirect(
          values.planner === "true"
            ? viewUrl(readOptions(values))
            : `/timeline?day=${selectedDay(values.day)}`,
          { status: 303 },
        );
  });
const browserError = (error: unknown) =>
  Effect.logError(error).pipe(
    Effect.as(
      HttpServerResponse.text(
        "Time tracking could not be loaded. Please try again.",
        { status: 500 },
      ),
    ),
  );
const timelineApiError = (error: TimelineError) =>
  error.cause === undefined
    ? new TimelineError({ message: error.message })
    : new HttpApiError.InternalServerError({});

export const timelineHandler = HttpApiBuilder.group(
  AppApi,
  "timeline",
  (handlers) =>
    handlers
      .handle("createLabel", ({ payload }) =>
        Effect.flatMap(Timeline, (service) =>
          service
            .saveLabel({ payload })
            .pipe(Effect.mapError(timelineApiError)),
        ),
      )
      .handle("updateTimeLabel", ({ params, payload }) =>
        Effect.flatMap(Timeline, (service) =>
          service
            .saveLabel({ id: params.id, payload })
            .pipe(Effect.mapError(timelineApiError)),
        ),
      )
      .handle("deleteBlock", ({ params }) =>
        Effect.flatMap(Timeline, (service) =>
          service.removeBlock(params).pipe(Effect.mapError(timelineApiError)),
        ),
      )
      .handle("startTimer", ({ payload }) =>
        Effect.flatMap(Timeline, (service) =>
          service.start(payload).pipe(Effect.mapError(timelineApiError)),
        ),
      )
      .handle("stopTimer", ({ params }) =>
        Effect.flatMap(Timeline, (service) =>
          service.stop(params).pipe(Effect.mapError(timelineApiError)),
        ),
      )
      .handle("listLabels", () =>
        Effect.flatMap(Timeline, (service) =>
          service
            .listLabels({})
            .pipe(
              Effect.mapError(() => new HttpApiError.InternalServerError({})),
            ),
        ),
      )
      .handle("listBlocks", () =>
        Effect.flatMap(Timeline, (service) =>
          service
            .listBlocks({})
            .pipe(
              Effect.mapError(() => new HttpApiError.InternalServerError({})),
            ),
        ),
      )
      .handle("createBlock", ({ payload }) =>
        Effect.flatMap(Timeline, (service) =>
          service
            .saveBlock({ payload })
            .pipe(Effect.mapError(timelineApiError)),
        ),
      )
      .handle("updateTimeBlock", ({ params, payload }) =>
        Effect.flatMap(Timeline, (service) =>
          service
            .saveBlock({ id: params.id, payload })
            .pipe(Effect.mapError(timelineApiError)),
        ),
      )
      .handle("blockForm", ({ query }) =>
        blockForm(query).pipe(Effect.catch(browserError)),
      )
      .handle("goalForm", ({ query }) =>
        goalForm(query).pipe(Effect.catch(browserError)),
      )
      .handle("page", ({ query }) =>
        page(query).pipe(Effect.catch(browserError)),
      )
      .handle("label", ({ payload }) =>
        mutate(payload, "label").pipe(Effect.catch(browserError)),
      )
      .handle("updateLabel", ({ params, payload }) =>
        mutate(payload, "label", params.id).pipe(Effect.catch(browserError)),
      )
      .handle("block", ({ payload }) =>
        mutate(payload, "block").pipe(Effect.catch(browserError)),
      )
      .handle("updateBlock", ({ params, payload }) =>
        mutate(payload, "block", params.id).pipe(Effect.catch(browserError)),
      )
      .handle("start", ({ payload }) =>
        mutate(payload, "start").pipe(Effect.catch(browserError)),
      )
      .handle("stop", ({ params, payload }) =>
        mutate(payload, "stop", params.id).pipe(Effect.catch(browserError)),
      )
      .handle("delete", ({ params, payload }) =>
        mutate(payload, "delete", params.id).pipe(Effect.catch(browserError)),
      ),
);
