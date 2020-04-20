export type ISelector<TState, T> = {
  [k in keyof T]: (state: TState) => T[k];
};
