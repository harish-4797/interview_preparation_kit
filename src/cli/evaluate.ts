import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { BatchInputCase, BatchOutput, BatchCaseResult } from '../core/types/batch';
import { validateBatchInput } from '../core/validator/kitValidator';
import { GenerationPipeline } from '../core/pipeline/generateKit';

// Load environment variables
dotenv.config();

/**
 * CLI Argument Parser
 */
function parseArgs(): { inputPath: string; outputPath: string } {
  const args = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') {
      inputPath = args[i + 1] || '';
      i++;
    } else if (arg === '--output' || arg === '-o') {
      outputPath = args[i + 1] || '';
      i++;
    }
  }

  if (!inputPath || !outputPath) {
    console.error(`
Usage:
  npm run evaluate -- --input <cases.json> --output <kits.json>

Arguments:
  --input, -i   Path to JSON file containing array of input cases
  --output, -o  Path where the output JSON file will be written
    `);
    process.exit(1);
  }

  return {
    inputPath: path.resolve(process.cwd(), inputPath),
    outputPath: path.resolve(process.cwd(), outputPath),
  };
}

async function main() {
  const { inputPath, outputPath } = parseArgs();

  console.log('====================================================');
  console.log(' Trao AI Interview Prep Kit - Batch Evaluator');
  console.log('====================================================');
  console.log(`Input File:  ${inputPath}`);
  console.log(`Output File: ${outputPath}`);
  console.log(`Provider:    ${process.env.LLM_PROVIDER || 'mock'}`);
  console.log('----------------------------------------------------');

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file does not exist: ${inputPath}`);
    process.exit(1);
  }

  let rawContent: string;
  try {
    rawContent = fs.readFileSync(inputPath, 'utf8');
  } catch (err: any) {
    console.error(`Error reading input file: ${err.message}`);
    process.exit(1);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (err: any) {
    console.error(`Error parsing input JSON: ${err.message}`);
    process.exit(1);
  }

  const validation = validateBatchInput(parsedJson);
  if (!validation.success) {
    console.error('Error: Input JSON does not match batch schema:', validation.errors);
    process.exit(1);
  }

  const cases: BatchInputCase[] = validation.data;
  console.log(`Loaded ${cases.length} evaluation case(s).\n`);

  const pipeline = new GenerationPipeline();
  const results: BatchCaseResult[] = [];

  for (let idx = 0; idx < cases.length; idx++) {
    const c = cases[idx];
    console.log(`[${idx + 1}/${cases.length}] Processing case "${c.id}" (${c.days} days, ${c.company_url})...`);

    try {
      const startTime = Date.now();
      const pipelineResult = await pipeline.run({
        jd: c.jd,
        companyUrl: c.company_url,
        days: c.days,
        allowLocalhost: true, // Crucial for local test URLs like http://localhost:8099/acme/
        onProgress: (step, total, stage, detail) => {
          // Keep stdout clean during batch run
          // console.log(`  -> Step ${step}/${total}: ${stage}`);
        },
      });

      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ✓ Case "${c.id}" SUCCESS (${elapsedSec}s, ${pipelineResult.kit.questions.length} questions, passes: ${pipelineResult.kit.coverage.passes})`);

      results.push({
        id: c.id,
        status: 'ok',
        kit: pipelineResult.kit,
        error: null,
      });
    } catch (err: any) {
      console.error(`  ✗ Case "${c.id}" FAILED: ${err.message}`);

      results.push({
        id: c.id,
        status: 'failed',
        kit: null,
        error: {
          code: err.code || 'PROCESSING_ERROR',
          message: err.message || 'An unexpected error occurred during kit generation.',
        },
      });
    }
  }

  const batchOutput: BatchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  };

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(batchOutput, null, 2), 'utf8');

  const okCount = results.filter((r) => r.status === 'ok').length;
  const failCount = results.filter((r) => r.status === 'failed').length;

  console.log('\n====================================================');
  console.log(' Batch Evaluation Complete');
  console.log(` Total Cases: ${cases.length} | Passed: ${okCount} | Failed: ${failCount}`);
  console.log(` Output written to: ${outputPath}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
