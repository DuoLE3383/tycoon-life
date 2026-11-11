import type { Religion } from '@/lib/engine';

export type NewLifeOptions = {
  name: string;
  byear: number;
  nation: string;
  religion: Religion;
  ints: string[];
  tals: string[];
};
