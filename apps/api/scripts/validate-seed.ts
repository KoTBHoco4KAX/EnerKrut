import { loadSeedData } from "../src/seed/load.js";
import { validateSeedData } from "../src/seed/validate.js";

async function main(): Promise<void> {
  try {
    const data = await loadSeedData();
    const report = validateSeedData(data);
    if (!report.valid) {
      process.stderr.write(`Seed validation failed with ${report.errors.length} error(s):\n`);
      process.stderr.write(`${report.errors.join("\n")}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(
      `Seed validation passed: ${report.counts.items} items, ${report.counts.cases} cases, ` +
        `${report.counts.rarityWeights} rarity weights, ${report.counts.dropTableRows} drop rows\n`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

await main();
