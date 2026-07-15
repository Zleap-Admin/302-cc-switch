import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const TAURI_CONFIG_PATH = path.join(
  PROJECT_ROOT,
  "src-tauri",
  "tauri.conf.json",
);
const WINDOWS_ICON_PATH = path.join(
  PROJECT_ROOT,
  "src-tauri",
  "icons",
  "icon.ico",
);

const tauriConfig = JSON.parse(fs.readFileSync(TAURI_CONFIG_PATH, "utf8"));
const windowsIcon = fs.readFileSync(WINDOWS_ICON_PATH);

function countSetBits(value: number): number {
  let remaining = value;
  let count = 0;

  while (remaining !== 0) {
    count += remaining & 1;
    remaining >>>= 1;
  }

  return count;
}

describe("Windows application icon", () => {
  it("uses the Windows ICO asset in the Tauri bundle", () => {
    expect(tauriConfig.bundle.icon).toContain("icons/icon.ico");
  });

  it("contains transparent DIB frames with Windows-compatible masks", () => {
    expect(windowsIcon.readUInt16LE(0)).toBe(0);
    expect(windowsIcon.readUInt16LE(2)).toBe(1);

    const frameCount = windowsIcon.readUInt16LE(4);
    const frameSizes: number[] = [];

    for (let index = 0; index < frameCount; index += 1) {
      const entryOffset = 6 + index * 16;
      const width = windowsIcon.readUInt8(entryOffset) || 256;
      const height = windowsIcon.readUInt8(entryOffset + 1) || 256;
      const planes = windowsIcon.readUInt16LE(entryOffset + 4);
      const bitsPerPixel = windowsIcon.readUInt16LE(entryOffset + 6);
      const frameLength = windowsIcon.readUInt32LE(entryOffset + 8);
      const frameOffset = windowsIcon.readUInt32LE(entryOffset + 12);
      const pixelDataOffset = frameOffset + 40;
      const pixelDataLength = width * height * 4;
      const maskOffset = pixelDataOffset + pixelDataLength;
      const maskStride = Math.ceil(width / 32) * 4;
      const maskLength = maskStride * height;

      frameSizes.push(width);
      expect(height).toBe(width);
      expect(planes).toBe(1);
      expect(bitsPerPixel).toBe(32);
      expect(windowsIcon.readUInt32LE(frameOffset)).toBe(40);
      expect(windowsIcon.readInt32LE(frameOffset + 4)).toBe(width);
      expect(windowsIcon.readInt32LE(frameOffset + 8)).toBe(height * 2);
      expect(frameLength).toBe(40 + pixelDataLength + maskLength);

      let transparentPixelCount = 0;
      for (let pixel = 0; pixel < width * height; pixel += 1) {
        if (windowsIcon.readUInt8(pixelDataOffset + pixel * 4 + 3) === 0) {
          transparentPixelCount += 1;
        }
      }

      const mask = windowsIcon.subarray(maskOffset, maskOffset + maskLength);
      const transparentMaskBitCount = mask.reduce(
        (count, byte) => count + countSetBits(byte),
        0,
      );

      expect(transparentPixelCount).toBeGreaterThan(0);
      expect(transparentMaskBitCount).toBe(transparentPixelCount);
    }

    expect(frameSizes).toEqual([16, 24, 32, 48, 64, 256]);
  });
});
