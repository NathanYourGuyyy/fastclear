export const RATES = {
  UK: { sea: 8500, express: 20000 },
  US: { sea: 17000, express: 28000 },
} as const;

export type Destination = keyof typeof RATES;
export type Method = keyof typeof RATES.UK;
