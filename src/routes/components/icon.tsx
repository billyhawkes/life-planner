const paths = {
  search: "m21 21-4.5-4.5M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  trash: "M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6",
  check: "m5 12 4 4L19 6",
  workout: "M3 12h4l3-8 4 16 3-8h4",
  habit: "M20 7h-9l3-3M4 17h9l-3 3M20 7a8 8 0 0 1 0 10M4 17A8 8 0 0 1 4 7",
  plus: "M12 5v14M5 12h14",
  chevron: "m8 10 4 4 4-4",
};

export const Icon = ({ name }: { readonly name: keyof typeof paths }) => (
  <svg
    class="icon"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={paths[name]} />
  </svg>
);
