export const PlannerFeedback = ({ message }: { readonly message?: string }) => (
  <section id="planner-feedback" aria-live="polite">
    {message ? (
      <p class="error" role="alert">
        {message}
      </p>
    ) : null}
  </section>
);
