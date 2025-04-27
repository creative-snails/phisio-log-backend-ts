export function indexToNatural(index: number): string {
  const naturalOrder = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
  if (index < 0 || index >= naturalOrder.length) return "";
  return naturalOrder[index];
}
