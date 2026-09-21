import { renderDocument } from "./document";

export const renderLoadError = () =>
  renderDocument(
    <main>
      <section class="card">
        <h1>Workout data could not be loaded.</h1>
        <p>Please try loading your workouts again.</p>
        <a class="button" href="/workouts">
          Try again
        </a>
      </section>
    </main>,
  );
