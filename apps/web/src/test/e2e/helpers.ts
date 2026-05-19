/// <reference types="node" />

import type { Page } from "@playwright/test";
import { inflateSync } from "node:zlib";

export function hasVariedPngBytes(png: Buffer) {
  const inflated = inflateSync(Buffer.concat(readPngChunks(png, "IDAT")));

  return new Set(inflated).size > 4;
}

export async function selectAuditFilter(page: Page, label: string, option: string) {
  await page.getByRole("button", { name: label }).click();
  await page.getByRole("menuitemradio", { name: new RegExp(`^${option}\\b`, "i") }).click();
}

function readPngChunks(png: Buffer, type: string) {
  const chunks: Buffer[] = [];
  let offset = 8;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const chunkType = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;

    if (chunkType === type) {
      chunks.push(png.subarray(dataStart, dataStart + length));
    }

    offset = dataStart + length + 4;
  }

  return chunks;
}
