import type { Parameters } from 'fast-check';

/**
 * fast-check settings for one property. fast-check prints the seed of a
 * failing run; set AKAD_PROPERTY_SEED to that value to replay it.
 *
 * @param numRuns - Runs per property.
 * @returns Parameters for fc.assert.
 */
export function propertyConfig(numRuns: number): Parameters<unknown> {
  const seed = process.env.AKAD_PROPERTY_SEED;
  return seed === undefined ? { numRuns } : { numRuns, seed: Number(seed) };
}
