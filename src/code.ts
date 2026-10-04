/**
 * Single-line code samples for the Type view's code mode. They mix letters with the brackets and
 * symbols layers and shifted characters (one-shot Shift, then a key), which is where switching
 * gets hard. Every character must be typeable on the layout, which a test checks.
 */
export const CODE_SAMPLES = [
  'if (x) { a[0] = 1; }',
  'f(a, b) - c',
  'let list = [1, 2, 3];',
  'arr[i] = arr[i - 1];',
  'return (a - b) / 2;',
  'fn main() { run(); }',
  'if (!done) { retry(); }',
  'x = y == z;',
  'const n = list.length;',
  'map[key] = value;',
  "obj['key'] = [];",
  "print('hello, world!');",
  'const re = /[a-z]/;',
  "dir = 'src\\lib';",
  "name = user?.name ?? 'anon';",
  'x != y;',
  'a[b[c]] = d;',
  '(1 - 2) / (3 - 4)',
  'let { a, b, c } = obj;',
  'fn(x) == fn(y)',
  '// todo: fix later',
  'if (a) { b(); } else { c(); }',
  'set(x, !x);',
  'grid[1][2] = 0;',
  'x = (y - 1) / 2;',
  'call(a)(b)(c);',
  'let s = `hi`;',
  'items.push([x, y]);',
  'while (n != 0) { n = n - 1; }',
  'assert(a == b, `bad`);',
  'x = ok ? a : b;',
  'let p = { x: 1, y: 2 };',
  'print("hi");',
  'if (a < b && b > c) {}',
  'total += price * qty;',
  'my_var = a | b;',
  '#include <stdio.h>',
  'email = "me@x.com";',
  'cd ~/src',
  'n % 2 == 0',
  'cost = $5;',
  'x ^= 1;',
];

/** `count` random samples, never the same one twice in a row. The Type view joins them with spaces. */
export function generateCode(count: number, rng: () => number = Math.random): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let s: string;
    do s = CODE_SAMPLES[Math.floor(rng() * CODE_SAMPLES.length)];
    while (CODE_SAMPLES.length > 1 && s === out[out.length - 1]);
    out.push(s);
  }
  return out;
}
