import { renderDocument } from "./document";

export const renderLoadError = () =>
  renderDocument(
    <main>
      <h1>Workout data could not be loaded.</h1>
      <a href="/workouts">Try again</a>
    </main>,
  );
