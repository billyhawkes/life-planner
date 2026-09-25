import styles from "../../public/styles.css" with { type: "text" };

export { styles };

const contentHash = (content: string) => {
  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    hash = Math.imul(hash ^ content.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const stylesUrl = `/styles.css?v=${contentHash(styles)}`;
