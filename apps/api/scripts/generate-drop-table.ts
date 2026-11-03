import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DATA_DIRECTORY, SEED_FILES } from "../src/paths.js";
import { loadSeedData } from "../src/seed/load.js";
import { validateSeedData } from "../src/seed/validate.js";

async function main(): Promise<void> {
  try {
    const data = await loadSeedData();
    const report = validateSeedData(data);
    if (!report.valid) {
      process.stderr.write(`${report.errors.join("\n")}\n`);
      process.exitCode = 1;
      return;
    }
    await writeFile(
      join(DATA_DIRECTORY, SEED_FILES.dropTable),
      `${JSON.stringify(report.dropTable, null, 2)}\n`,
      "utf8",
    );
    process.stdout.write(
      `Generated ${report.dropTable.length} case drop table rows in ${SEED_FILES.dropTable}\n`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

await main();
