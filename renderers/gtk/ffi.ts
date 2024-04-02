

export const readUntilNull = (pointer: number | string, size: 1 | 4 | 8 = 8) => {
  // Assume 64 bit & LE?
  const pointerBuffer = Buffer.alloc(8);
  pointerBuffer.writeUInt64LE(pointer);

  let buffer;
  let done = false;
  let i = 1;
  let value;
  do {
    //console.log('READING @', pointer, '+', size * i);
    buffer = pointerBuffer.readPointer(0, size * i);
    switch (size) {
      case 1:
        value = buffer[(size * (i - 1))]; break;
      case 4:
        value = buffer.readUint32LE(size * (i - 1)); break;
      case 8:
        value = buffer.readUInt64LE(size * (i - 1)); break;
      default:
        throw new Error();
    }

    if (value === 0)
      done = true;
    else
      i++;
  } while (!done)

  return buffer;
}