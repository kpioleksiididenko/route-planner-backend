function excludeFields<T, Key extends keyof T>(
  schemeObj: T,
  keys: Key[],
): Omit<T, Key> {
  for (const key of keys) {
    delete schemeObj[key];
  }
  return schemeObj;
}

export default excludeFields;
