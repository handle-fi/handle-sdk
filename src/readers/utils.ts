export const buildFilter = (value: any, depth = 0): string => {
  const type = typeof value;

  if (type === "string") {
    return `"${value}"`;
  }

  if (type === "object") {
    const propertiesAndValues = Object.keys(value).map(
      (k) => `${k}: ${buildFilter(value[k], depth + 1)}`
    );

    if (depth === 0) {
      return `${propertiesAndValues}`;
    }

    return `{ ${propertiesAndValues} }`;
  }

  return value;
};
