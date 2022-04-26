export const getDeadline = (deadline?: number) => deadline ?? Math.floor(Date.now() / 1000) + 300;
