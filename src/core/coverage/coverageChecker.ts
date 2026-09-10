import { Requirement, Question, Coverage } from '../types/kit';
import { QuestionGenerator } from '../generation/questionGenerator';
import { CompanyBrief } from '../types/kit';

export interface CoverageAnalysis {
  coveredRequirementIds: string[];
  uncoveredRequirementIds: string[];
  uncoveredMustHaves: Requirement[];
  uncoveredNiceToHaves: Requirement[];
  isFullyCovered: boolean;
  hasAllMustHavesCovered: boolean;
  coverageRatio: number;
}

export class CoverageChecker {
  /**
   * Deterministic code-based coverage gap calculation (NO LLM)
   */
  public static analyze(requirements: Requirement[], questions: Question[]): CoverageAnalysis {
    const coveredSet = new Set<string>();

    for (const q of questions) {
      for (const rid of q.requirement_ids) {
        coveredSet.add(rid);
      }
    }

    const uncoveredRequirementIds: string[] = [];
    const uncoveredMustHaves: Requirement[] = [];
    const uncoveredNiceToHaves: Requirement[] = [];

    for (const req of requirements) {
      if (!coveredSet.has(req.id)) {
        uncoveredRequirementIds.push(req.id);
        if (req.priority === 'must') {
          uncoveredMustHaves.push(req);
        } else {
          uncoveredNiceToHaves.push(req);
        }
      }
    }

    const coveredCount = requirements.length - uncoveredRequirementIds.length;
    const coverageRatio = requirements.length > 0 ? coveredCount / requirements.length : 1.0;

    return {
      coveredRequirementIds: Array.from(coveredSet),
      uncoveredRequirementIds,
      uncoveredMustHaves,
      uncoveredNiceToHaves,
      isFullyCovered: uncoveredRequirementIds.length === 0,
      hasAllMustHavesCovered: uncoveredMustHaves.length === 0,
      coverageRatio,
    };
  }

  /**
   * Runs the second-pass gap-closing loop until all must-have requirements
   * are covered or maxPasses is reached.
   */
  public static async runCoverageLoop(
    requirements: Requirement[],
    initialQuestions: Question[],
    companyBrief: CompanyBrief,
    questionGenerator: QuestionGenerator,
    maxPasses: number = 3,
    onProgress?: (pass: number, uncoveredCount: number) => void
  ): Promise<{ questions: Question[]; coverage: Coverage }> {
    let currentQuestions = [...initialQuestions];
    let passes = 1;

    while (passes <= maxPasses) {
      const analysis = CoverageChecker.analyze(requirements, currentQuestions);

      if (onProgress) {
        onProgress(passes, analysis.uncoveredRequirementIds.length);
      }

      // If all must-haves and nice-to-haves are covered, we are done
      if (analysis.isFullyCovered) {
        return {
          questions: currentQuestions,
          coverage: {
            uncovered_requirement_ids: [],
            passes,
          },
        };
      }

      // If on the last allowed pass, check if must-haves are covered
      if (passes === maxPasses) {
        return {
          questions: currentQuestions,
          coverage: {
            uncovered_requirement_ids: analysis.uncoveredRequirementIds,
            passes,
          },
        };
      }

      // Pick uncovered requirements (prioritizing must-haves, then nice-to-haves)
      const targets = [...analysis.uncoveredMustHaves, ...analysis.uncoveredNiceToHaves];
      if (targets.length === 0) {
        break;
      }

      // Generate gap-closing questions
      const gapQuestions = await questionGenerator.generateGapClosingQuestions(
        targets,
        companyBrief,
        currentQuestions.length
      );

      currentQuestions = currentQuestions.concat(gapQuestions);
      passes++;
    }

    const finalAnalysis = CoverageChecker.analyze(requirements, currentQuestions);
    return {
      questions: currentQuestions,
      coverage: {
        uncovered_requirement_ids: finalAnalysis.uncoveredRequirementIds,
        passes: Math.min(passes, maxPasses),
      },
    };
  }
}
