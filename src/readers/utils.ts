export const buildFilter = (value: any, depth = 0): string => {
  const type = typeof value;

  if (type === "string") {
    return `"${value}"`;
  }

  if (type === "object") {
    const keys = Object.keys(value);

    if (keys.length === 0 && depth === 0) {
      return "";
    }

    const propertiesAndValues = keys.map((k) => `${k}: ${buildFilter(value[k], depth + 1)}`);

    if (depth === 0) {
      return `( ${propertiesAndValues} )`;
    }

    return `{ ${propertiesAndValues} }`;
  }

  return value;
};
