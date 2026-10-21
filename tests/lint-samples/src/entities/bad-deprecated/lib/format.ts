// expect: @typescript-eslint/no-deprecated
/** @deprecated formatName을 써요. */
const oldFormat = (name: string) => name.trim();

export const formatName = (name: string) => oldFormat(name);
