const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal ZIP file creator using Node.js built-ins
function createZip(files, outputPath) {
  const buffers = [];
  const centralDir = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const compressedData = data; // Store without compression for simplicity

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0, 6); // General purpose bit flag
    localHeader.writeUInt16LE(0, 8); // Compression method (0 = stored)
    localHeader.writeUInt16LE(0, 10); // Last mod time
    localHeader.writeUInt16LE(0, 12); // Last mod date
    localHeader.writeUInt32LE(crc, 14); // CRC-32
    localHeader.writeUInt32LE(compressedData.length, 18); // Compressed size
    localHeader.writeUInt32LE(data.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // File name length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuffer.copy(localHeader, 30);

    buffers.push(localHeader);
    buffers.push(compressedData);

    // Central directory entry
    const centralEntry = Buffer.alloc(46 + nameBuffer.length);
    centralEntry.writeUInt32LE(0x02014b50, 0); // Central dir signature
    centralEntry.writeUInt16LE(20, 4); // Version made by
    centralEntry.writeUInt16LE(20, 6); // Version needed
    centralEntry.writeUInt16LE(0, 8); // General purpose bit flag
    centralEntry.writeUInt16LE(0, 10); // Compression method
    centralEntry.writeUInt16LE(0, 12); // Last mod time
    centralEntry.writeUInt16LE(0, 14); // Last mod date
    centralEntry.writeUInt32LE(crc, 16); // CRC-32
    centralEntry.writeUInt32LE(compressedData.length, 20); // Compressed size
    centralEntry.writeUInt32LE(data.length, 24); // Uncompressed size
    centralEntry.writeUInt16LE(nameBuffer.length, 28); // File name length
    centralEntry.writeUInt16LE(0, 30); // Extra field length
    centralEntry.writeUInt16LE(0, 32); // File comment length
    centralEntry.writeUInt16LE(0, 34); // Disk number start
    centralEntry.writeUInt16LE(0, 36); // Internal file attributes
    centralEntry.writeUInt32LE(0, 38); // External file attributes
    centralEntry.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuffer.copy(centralEntry, 46);

    centralDir.push(centralEntry);
    offset += localHeader.length + compressedData.length;
  }

  const centralDirBuffer = Buffer.concat(centralDir);
  const centralDirOffset = offset;

  // End of central directory record
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // End of central dir signature
  endRecord.writeUInt16LE(0, 4); // Number of this disk
  endRecord.writeUInt16LE(0, 6); // Disk where central dir starts
  endRecord.writeUInt16LE(files.length, 8); // Number of central dir records on this disk
  endRecord.writeUInt16LE(files.length, 10); // Total number of central dir records
  endRecord.writeUInt32LE(centralDirBuffer.length, 12); // Size of central directory
  endRecord.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  endRecord.writeUInt16LE(0, 20); // Comment length

  const zipBuffer = Buffer.concat([...buffers, centralDirBuffer, endRecord]);
  fs.writeFileSync(outputPath, zipBuffer);
  console.log(`Created ${outputPath} (${zipBuffer.length} bytes)`);
}

// CRC-32 implementation
function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Main
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error('Usage: node create-zip.js <input-file> <output-zip>');
  process.exit(1);
}

const data = fs.readFileSync(inputFile);
const fileName = path.basename(inputFile);
createZip([{ name: fileName, data }], outputFile);
