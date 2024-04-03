import { GTKWindow } from './gen/mod.ts'

console.log("AA");

try {
  const win = new GTKWindow();
} catch (error) {
  console.error(error);
}
