export function chunk<T>(array: Array<T>, size: number): Array<Array<T>> {
  const chunks: Array<Array<T>> = [];
  let currentChunk: Array<T> = [];
  array.forEach((item) => {
    currentChunk.push(item);
    if (currentChunk.length === size) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  });
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}
