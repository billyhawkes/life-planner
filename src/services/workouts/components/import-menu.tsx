import { Icon } from "@/routes/components/icon";
import { viewUrl, type ViewOptions } from "../helpers";

export const ImportMenu = ({ options }: { readonly options: ViewOptions }) => {
  const url = `${viewUrl(options)}&import=true`;
  return (
    <div class="create-menu">
      <button
        type="button"
        id="import-menu-trigger"
        class="button secondary"
        popovertarget="import-menu-items"
      >
        Import <Icon name="chevron" />
      </button>
      <nav
        id="import-menu-items"
        popover="auto"
        class="create-menu-items"
        aria-label="Import source"
      >
        <a href={url} data-on:click__prevent={`@get('${url}')`}>
          Apple Health
        </a>
      </nav>
    </div>
  );
};
