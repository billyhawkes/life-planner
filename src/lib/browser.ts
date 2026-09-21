import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";

export const isDatastar = (request: HttpServerRequest.HttpServerRequest) =>
  request.headers["datastar-request"] === "true";

export const sse = (events: ReadonlyArray<string>) =>
  HttpServerResponse.text(events.join(""), {
    contentType: "text/event-stream",
    headers: { "Cache-Control": "no-cache" },
  });
