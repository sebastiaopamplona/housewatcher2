export let accessToken = '';

export const setAccessToken = (t: string): void => {
  accessToken = t;
};

export const getAccessToken = (): string => {
  return accessToken;
};
