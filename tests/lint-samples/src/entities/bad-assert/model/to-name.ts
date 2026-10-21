// expect: @typescript-eslint/consistent-type-assertions
interface Named {
  name: string;
}

export const toName = (value: object) => (value as Named).name;
