const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Use node's built-in zlib to create a zip file
// We'll use the jszip-like approach with raw buffers
const indexJs = fs.readFileSync(path.join(__dirname, 'index.js'));

// Create a minimal ZIP file manually
function createZip(files) {
  const entries = [];
  let offset = 0;

  for (const [name, data] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const crc = crc32(data);

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4);  // Version needed
    localHeader.writeUInt16LE(0, 6);   // General purpose flags
    localHeader.writeUInt16LE(0, 8);   // Compression method (stored)
    localHeader.writeUInt16LE(0, 10);  // Last mod time
    localHeader.writeUInt16LE(0, 12);  // Last mod date
    localHeader.writeUInt32LE(crc, 14); // CRC-32
    localHeader.writeUInt32LE(data.length, 18); // Compressed size
    localHeader.writeUInt32LE(data.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28);  // Extra field length
    nameBuffer.copy(localHeader, 30);

    entries.push({ name: nameBuffer, data, crc, offset, localHeader });
    offset += localHeader.length + data.length;
  }

  // Central directory
  const centralEntries = [];
  for (const entry of entries) {
    const centralHeader = Buffer.alloc(46 + entry.name.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory header
    centralHeader.writeUInt16LE(20, 4);  // Version made by
    centralHeader.writeUInt16LE(20, 6);  // Version needed
    centralHeader.writeUInt16LE(0, 8);   // Flags
    centralHeader.writeUInt16LE(0, 10);  // Compression
    centralHeader.writeUInt16LE(0, 12);  // Time
    centralHeader.writeUInt16LE(0, 14);  // Date
    centralHeader.writeUInt32LE(entry.crc, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20); // Compressed
    centralHeader.writeUInt32LE(entry.data.length, 24); // Uncompressed
    centralHeader.writeUInt16LE(entry.name.length, 28);
    centralHeader.writeUInt16LE(0, 30);  // Extra field length
    centralHeader.writeUInt16LE(0, 32);  // Comment length
    centralHeader.writeUInt16LE(0, 34);  // Disk number
    centralHeader.writeUInt16LE(0, 36);  // Internal attrs
    centralHeader.writeUInt32LE(0, 38);  // External attrs
    centralHeader.writeUInt32LE(entry.offset, 42); // Relative offset
    entry.name.copy(centralHeader, 46);
    centralEntries.push(centralHeader);
  }

  const centralDirSize = centralEntries.reduce((s, b) => s + b.length, 0);

  // End of central directory
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);  // Disk number
  endRecord.writeUInt16LE(0, 6);  // Disk with central dir
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirSize, 12);
  endRecord.writeUInt32LE(offset, 16); // Offset of central dir
  endRecord.writeUInt16LE(0, 20); // Comment length

  const buffers = [];
  for (const entry of entries) {
    buffers.push(entry.localHeader, entry.data);
  }
  for (const central of centralEntries) {
    buffers.push(central);
  }
  buffers.push(endRecord);

  return Buffer.concat(buffers);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const zip = createZip({ 'index.js': indexJs });
fs.writeFileSync(path.join(__dirname, 'function.zip'), zip);
console.log(`Created function.zip (${zip.length} bytes)`);
