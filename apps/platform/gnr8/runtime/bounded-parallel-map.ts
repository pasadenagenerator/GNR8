/** Read independent items concurrently without overwhelming an external store. */
export async function boundedParallelMap<T, R>(
  items: readonly T[],
  concurrency: number,
  read: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('invalid_parallel_read_limit');
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await read(items[index]!, index);
    }
  }));
  return results;
}
