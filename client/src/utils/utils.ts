import crypto from "crypto";
import fs from "fs";

export function calculateFileChecksum(filePath: string): string
{
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}
