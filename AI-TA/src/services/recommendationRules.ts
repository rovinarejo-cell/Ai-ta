import type { IndicatorId } from "../data/observationIndicators";
import type { AnalysisEntry, InstructionalAnalysis } from "./indicatorAnalysis";
export const engineVersion = "illustrative-v0.3";
export const researchNote =
  "These rules are illustrative, preliminary design hypotheses and are not yet empirically validated. They are not validated interventions or clinically established thresholds. Strategies are suggestions for teacher consideration; outcomes are not guaranteed. The teacher remains the final decision-maker. No diagnosis, trained AI model, or overall learner score is used.";
interface RecommendationRule {
  id: string;
  title: string;
  indicators: readonly IndicatorId[];
  strategy: string;
  explanation: string;
}
export const recommendationRules: readonly RecommendationRule[] = [
  {
    id: "A",
    title: "Support a clear start",
    indicators: ["taskInitiation"],
    strategy:
      "Break the task into smaller steps and provide a clear starting prompt.",
    explanation:
      "Smaller steps and an explicit starting cue may clarify how to begin when support with task initiation was recorded.",
  },
  {
    id: "B",
    title: "Make instructions sequential",
    indicators: ["followingInstructions"],
    strategy:
      "Give short, sequential instructions and ask the learner to demonstrate or explain the next step.",
    explanation:
      "A short sequence and a check of the next step may help the teacher identify which part of an instruction needs clarification.",
  },
  {
    id: "C",
    title: "Use a manageable task segment",
    indicators: ["sustainedAttention"],
    strategy:
      "Offer a manageable task segment with a clear goal and a planned opportunity to pause or check progress.",
    explanation:
      "A bounded segment and a planned check-in may provide an opportunity to review engagement within this activity.",
  },
  {
    id: "D",
    title: "Make progress visible",
    indicators: ["taskCompletion"],
    strategy:
      "Divide the activity into smaller milestones and provide feedback as each milestone is completed.",
    explanation:
      "Visible milestones may clarify progress and offer opportunities for feedback when task completion required support.",
  },
  {
    id: "E",
    title: "Clarify meaning and check understanding",
    indicators: ["readingMeaning", "understandingTask"],
    strategy:
      "Present instructions in clear language, use relevant visual support where appropriate, and check understanding.",
    explanation:
      "Clear language and a check of meaning may help the teacher explore what was understood. Visual support should be used only when relevant to this task.",
  },
  {
    id: "F",
    title: "Model a problem-solving approach",
    indicators: ["problemSolving"],
    strategy:
      "Demonstrate one worked example and offer graduated hints before independent practice.",
    explanation:
      "A worked example and graduated hints may make the approach visible while giving the teacher opportunities to adjust support.",
  },
];
export interface SuggestedRecommendation {
  id: string;
  version: string;
  ruleId: string;
  title: string;
  strategy: string;
  condition: string;
  explanation: string;
  evidence: AnalysisEntry[];
}
export interface RecommendationResult {
  suggestions: SuggestedRecommendation[];
  strengths: AnalysisEntry[];
}
/** Pure generation: no decisions, mutations, scores, or activity-plan generation. */
export function generateRecommendations(
  analysis: InstructionalAnalysis,
): RecommendationResult {
  const entries = analysis.groups.flatMap((group) => group.entries);
  const suggestions = recommendationRules.flatMap((rule) => {
    const evidence = entries.filter(
      (entry) =>
        rule.indicators.includes(entry.indicatorId) &&
        (entry.rating === 1 || entry.rating === 2),
    );
    if (!evidence.length) return [];
    return [
      {
        id: `${engineVersion}:${rule.id}`,
        version: engineVersion,
        ruleId: rule.id,
        title: rule.title,
        strategy: rule.strategy,
        condition: `Rule ${rule.id}: ${rule.indicators.map((id) => entries.find((entry) => entry.indicatorId === id)?.indicator ?? id).join(" OR ")} has a recorded rating of 1 or 2.`,
        explanation: rule.explanation,
        evidence,
      },
    ];
  });
  // One result per rule; E retains both evidence records without duplicating its strategy.
  return {
    suggestions,
    strengths: entries.filter((entry) => entry.rating === 3),
  };
}
