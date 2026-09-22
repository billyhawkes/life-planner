import { formatNumber, viewUrl, type ViewOptions } from "../helpers";
import type { HealthImportStats } from "../schema";

export const HealthImportForm = ({
  options,
  error,
  stats,
}: {
  readonly options: ViewOptions;
  readonly error?: string;
  readonly stats?: typeof HealthImportStats.Type;
}) => {
  const action = `/workouts/import?${new URLSearchParams(Object.entries(options).map(([key, value]) => [key, String(value)]))}`;
  return (
    <section id="workout-form">
      <dialog
        id="health-import-dialog"
        class={
          stats
            ? "form-dialog workout-dialog import-result-dialog"
            : "form-dialog workout-dialog"
        }
        open
        aria-labelledby="health-import-title"
      >
        <header class="dialog-heading">
          <div>
            <h2 id="health-import-title">
              {stats === undefined ? "Import Apple Health" : "Import complete"}
            </h2>
            <p>
              {stats === undefined
                ? "Select the ZIP exported from Apple Health to import your workouts."
                : "Your Apple Health export has been processed."}
            </p>
          </div>
          <a
            class="dialog-close"
            href={viewUrl(options)}
            data-dialog-close=""
            aria-label="Close import form"
          >
            ×
          </a>
        </header>
        {stats !== undefined ? (
          <section aria-label="Import results">
            <div role="status">
              <dl class="import-stats">
                <div>
                  <dt>Workouts imported</dt>
                  <dd>{stats.imported}</dd>
                </div>
                <div>
                  <dt>Plans replaced</dt>
                  <dd>{stats.plansReplaced}</dd>
                </div>
                <div>
                  <dt>Activity types</dt>
                  <dd>{stats.activityTypes}</dd>
                </div>
                <div>
                  <dt>Total duration</dt>
                  <dd>{formatNumber(stats.durationMinutes / 60)} hours</dd>
                </div>
                <div>
                  <dt>Total distance</dt>
                  <dd>{formatNumber(stats.distanceKilometres)} km</dd>
                </div>
              </dl>
              <p class="import-summary-note">
                {stats.imported === 0
                  ? "No workouts were found in this export."
                  : "Includes new and updated workouts. Matched plans are replaced by completed sessions."}
              </p>
            </div>
            <footer>
              <a class="button" href={viewUrl(options)} data-dialog-close="">
                Done
              </a>
            </footer>
          </section>
        ) : (
          <form
            method="post"
            action={action}
            enctype="multipart/form-data"
            data-on:submit__prevent={`@post('${action}', {contentType: 'form'})`}
            data-indicator:importing=""
          >
            <label>
              Apple Health ZIP
              <input
                type="file"
                name="archive"
                accept=".zip,application/zip,application/x-zip-compressed"
                required
                autofocus
              />
            </label>
            <p>
              Archives up to 2 GB. Large exports may take a few minutes.
              Re-importing updates existing workouts.
            </p>
            {error ? (
              <p class="error" role="alert" tabindex="-1">
                {error}
              </p>
            ) : null}
            <footer>
              <a
                class="button secondary"
                href={viewUrl(options)}
                data-dialog-close=""
              >
                Cancel
              </a>
              <button
                type="submit"
                data-attr:disabled="$importing"
                data-text="$importing ? 'Importing…' : 'Import workouts'"
              >
                Import workouts
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </section>
  );
};
