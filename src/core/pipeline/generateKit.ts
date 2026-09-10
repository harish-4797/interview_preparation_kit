import { Kit, QuestionCategory } from '../types/kit';
import { LLMClient } from '../llm/client';
import { CompanyCrawler } from '../crawler/crawler';
import { CompanyResearcher } from '../research/companyResearch';
import { RequirementExtractor } from '../extraction/requirementExtractor';
import { QuestionGenerator } from '../generation/questionGenerator';
import { CoverageChecker } from '../coverage/coverageChecker';
import { DeterministicScheduler } from '../scheduler/scheduler';
import { validateKit } from '../validator/kitValidator';

export interface PipelineOptions {
  jd: string;
  companyUrl: string;
  days: number;
  onProgress?: (step: number, totalSteps: number, stageName: string, detail?: string) => void;
  allowLocalhost?: boolean;
}

export interface PipelineResult {
  kit: Kit;
  warnings: string[];
  executionTimeMs: number;
}

export class GenerationPipeline {
  private llm: LLMClient;
  private crawler: CompanyCrawler;
  private researcher: CompanyResearcher;
  private extractor: RequirementExtractor;
  private questionGenerator: QuestionGenerator;

  constructor(llmClientInstance?: LLMClient) {
    this.llm = llmClientInstance || new LLMClient();
    this.crawler = new CompanyCrawler();
    this.researcher = new CompanyResearcher(this.llm);
    this.extractor = new RequirementExtractor(this.llm);
    this.questionGenerator = new QuestionGenerator(this.llm);
  }

  public async run(options: PipelineOptions): Promise<PipelineResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const totalSteps = 11;
    const progress = (step: number, name: string, detail?: string) => {
      if (options.onProgress) {
        options.onProgress(step, totalSteps, name, detail);
      }
    };

    // STEP 1: Input ingestion and validation
    progress(1, 'Ingesting Inputs', 'Sanitizing JD text, URL format, and timebox parameters.');
    const sanitizedJd = (options.jd || '').trim();
    if (!sanitizedJd) {
      throw new Error('Job description text cannot be empty.');
    }
    const companyUrl = (options.companyUrl || '').trim();
    if (!companyUrl) {
      throw new Error('Company website URL is required.');
    }
    const daysAvailable = Math.max(1, Math.round(options.days || 5));

    // STEP 2: Extract requirements from JD
    progress(2, 'Extracting Requirements', 'Analyzing job description for technical, behavioural, and domain requirements.');
    const extractionResult = await this.extractor.extract(sanitizedJd);
    const role = extractionResult.role;
    if (extractionResult.isThinJd) {
      warnings.push('The provided job description was brief. Requirements reflect only explicitly stated items without fabrication.');
    }
    warnings.push(...extractionResult.notes);

    // STEP 3: Research company website (crawling with link discovery and ranking)
    progress(3, 'Crawling Company Website', `Discovering and ranking links on ${companyUrl}...`);
    const crawlResult = await this.crawler.crawl(companyUrl, {
      allowLocalhost: options.allowLocalhost ?? true,
      maxPages: 2,
      timeoutMs: 3000,
    });
    warnings.push(...crawlResult.notes);

    // STEP 4: Search for public discussion of interview process
    progress(4, 'Investigating Interview Process', 'Synthesizing company hiring patterns and public interview discussions.');
    const researchFindings = await this.researcher.research(companyUrl, crawlResult, role.title);

    // STEP 5: Generate Company Brief
    progress(5, 'Compiling Company Brief', 'Assembling verified summary and what they do.');
    const companyBrief = researchFindings.brief;

    // STEP 6: Finalize Role Breakdown
    progress(6, 'Finalizing Role Breakdown', `Role: ${role.title} (${role.seniority}).`);

    // STEP 7 & 8: Generate category-isolated questions and flashcards in parallel
    progress(7, 'Generating Questions & Flashcards', 'Generating technical, behavioural, system-design, and flashcards concurrently.');
    const categories: QuestionCategory[] = ['technical', 'behavioural', 'system-design', 'company-fit'];

    const [categoryQuestionBatches, flashcards] = await Promise.all([
      Promise.all(
        categories.map((cat, idx) =>
          this.questionGenerator.generateQuestionsForCategory(
            cat,
            role.requirements,
            companyBrief,
            researchFindings.hiringProcessSummary,
            idx * 4
          )
        )
      ),
      this.questionGenerator.generateFlashcards(role.requirements, []),
    ]);

    const initialQuestions = categoryQuestionBatches.flat();

    // STEP 9: Deterministic Coverage Checking (in CODE, NOT LLM)
    progress(9, 'Deterministic Coverage Check', 'Running arithmetic set-difference coverage validation.');
    const initialCoverage = CoverageChecker.analyze(role.requirements, initialQuestions);

    // STEP 10: Second Pass (Gap-Closing Loop)
    progress(10, 'Second Pass Gap Closing', `Identified ${initialCoverage.uncoveredRequirementIds.length} uncovered requirements. Closing gaps...`);
    const coverageLoopResult = await CoverageChecker.runCoverageLoop(
      role.requirements,
      initialQuestions,
      companyBrief,
      this.questionGenerator,
      3, // up to 3 passes
      (pass: number, uncovered: number) => {
        progress(10, 'Second Pass Gap Closing', `Pass ${pass}: ${uncovered} requirements pending coverage.`);
      }
    );
    const finalQuestions = coverageLoopResult.questions;
    const finalCoverage = coverageLoopResult.coverage;

    // STEP 11: Deterministic Arithmetic Schedule Allocation (in CODE, NOT LLM)
    progress(11, 'Allocating Study Schedule', `Distributing ${finalQuestions.length} questions across ${daysAvailable} days.`);
    const schedule = DeterministicScheduler.schedule(daysAvailable, finalQuestions, role.requirements);

    // Assemble final Kit
    const kit: Kit = {
      source: {
        company: crawlResult.companyName || role.title.split(' ')[0] || 'Company',
        company_url: companyUrl,
        role: role.title,
        location: 'Remote / Unspecified',
        jd_chars: sanitizedJd.length,
        researched_at: new Date().toISOString(),
        pages_used: crawlResult.pagesUsed.length > 0 ? crawlResult.pagesUsed : [companyUrl],
      },
      company_brief: companyBrief,
      role,
      questions: finalQuestions,
      flashcards,
      schedule,
      coverage: finalCoverage,
    };

    // Strict validation against Appendix A
    const validation = validateKit(kit);
    if (!validation.success) {
      console.warn('[GenerationPipeline] Schema validation warnings:', validation.errors);
      warnings.push(...validation.errors);
    }

    const executionTimeMs = Date.now() - startTime;
    return { kit, warnings, executionTimeMs };
  }
}
