import type { LearnerProfileData, TeacherObservationData } from "../types";
import type { RecommendationDecision } from "./decisionStorage";
import { generateRecommendations } from "./recommendationRules";
import { analyzeObservation } from "./indicatorAnalysis";
import { observationKey } from "./observationStorage";

export const supportTypes = [
  ["visual", "Visual support"],
  ["verbal", "Verbal instructions"],
  ["modelling", "Demonstration/modelling"],
  ["breakdown", "Task breakdown"],
  ["prompting", "Prompting"],
  ["practice", "Repetition/practice"],
  ["interests", "Interest-based examples"],
] as const;
export type SupportType = (typeof supportTypes)[number][0];
export interface ActivityStep {
  id: string;
  instruction: string;
  teacherGuidance: string;
  learnerParticipation: string;
}
export interface ActivitySupport {
  type: SupportType;
  enabled: boolean;
  description: string;
}
export interface ActivityPlan {
  id: string;
  learnerId: string;
  sourceObservationId: string | null;
  sourceObservationKey: string;
  sourceDecision: RecommendationDecision;
  profileContext: Pick<
    LearnerProfileData,
    "interests" | "communicationPreferences"
  >;
  subject: string;
  objective: string;
  targetSkill: string;
  title: string;
  description: string;
  materials: string;
  durationMinutes: number;
  steps: ActivityStep[];
  supports: ActivitySupport[];
  assessmentObservation: string;
  successCriteria: string;
  assessmentNotes: string;
  positiveFeedback: string;
  constructiveFeedback: string;
  repeatOrModify: string;
  status: "draft" | "approved";
  approvedAt: string | null;
  savedAt: string | null;
}
/** Only the latest decision for the exact current evidence is eligible. */
export function approvedDecisions(
  observation: TeacherObservationData,
  history: RecommendationDecision[],
): RecommendationDecision[] {
  const key = observationKey(observation);
  const suggestions = generateRecommendations(
    analyzeObservation(observation),
  ).suggestions;
  const latest = new Map<string, RecommendationDecision>();
  for (const decision of history) {
    if (
      decision.learnerId === observation.learnerId &&
      decision.observationKey === key &&
      suggestions.some((item) => item.id === decision.recommendationId)
    )
      latest.set(decision.recommendationId, decision);
  }
  return [...latest.values()].filter(
    (decision) => decision.action === "accept" || decision.action === "modify",
  );
}
const objectives: Record<string, string> = {
  A: "identify and begin a first task step",
  B: "demonstrate or explain the next instruction",
  C: "participate in one agreed task segment and check progress",
  D: "complete one agreed milestone and reflect on it",
  E: "explain the meaning of the task or text in their own way",
  F: "attempt and explain one problem-solving step",
};
const acceptedSupports: Record<string, SupportType[]> = {
  A: ["breakdown", "prompting"],
  B: ["verbal", "breakdown"],
  C: ["breakdown"],
  D: ["breakdown"],
  E: [],
  F: ["modelling", "prompting"],
};
/** Produces an editable suggestion, not an assigned or approved activity. */
export function createActivityPlan(
  decision: RecommendationDecision,
  profile: LearnerProfileData,
): ActivityPlan {
  if (decision.action !== "accept" && decision.action !== "modify")
    throw new Error("A teacher-approved strategy is required.");
  const observation = decision.observation;
  const rule = decision.recommendation.ruleId;
  const modified = decision.action === "modify";
  const preferences = profile.communicationPreferences;
  const visualRelevant =
    !modified && rule === "E" && preferences.includes("Visual instructions");
  const descriptions: Record<SupportType, string> = {
    visual: preferences.includes("Visual instructions")
      ? "Consider a task-relevant visual cue, consistent with the recorded visual-instruction preference; check suitability with the learner."
      : "Optional: choose a task-relevant visual cue only if the teacher judges it useful.",
    verbal:
      "Use short verbal instructions and invite the learner to explain or demonstrate the next step.",
    modelling:
      "Demonstrate one example, then invite the learner to try a comparable step.",
    breakdown:
      "Agree a manageable first step or milestone with the learner and check progress before continuing.",
    prompting:
      "Offer the least prompt needed and give the learner time to respond; adjust support through observation.",
    practice:
      "Optional: repeat a comparable task if the teacher and learner find practice useful.",
    interests: profile.interests.length
      ? `Optional: consider examples involving ${profile.interests.join(", ")} if relevant to the objective. Confirm the learner wants to use them.`
      : "No interests recorded. Ask the learner about a relevant example rather than inventing an interest.",
  };
  const strategy = decision.strategy;
  return {
    id: `plan:${decision.id}`,
    learnerId: decision.learnerId,
    sourceObservationId: observation.observationId ?? null,
    sourceObservationKey: decision.observationKey,
    sourceDecision: decision,
    profileContext: {
      interests: [...profile.interests],
      communicationPreferences: [...preferences],
    },
    subject: observation.context.subject || profile.subject,
    objective: `During ${observation.activity}, the learner will ${modified ? `practise ${decision.recommendation.evidence.map((item) => item.indicator.toLowerCase()).join(" and ")} using the teacher-modified strategy` : (objectives[rule] ?? "practise the agreed target skill")}. Teacher to refine for this lesson.`,
    targetSkill: decision.recommendation.evidence
      .map((item) => item.indicator)
      .join(" / "),
    title: `Guided activity: ${observation.activity}`,
    description: `Use the following teacher-${modified ? "modified" : "accepted"} strategy during the observed task: ${strategy}`,
    materials:
      "Suggested: materials for the recorded task, a way to record the agreed steps, and paper or another accessible response format. Teacher to confirm availability.",
    durationMinutes: 10,
    steps: [
      {
        id: crypto.randomUUID(),
        instruction: "Agree the learning objective and first task step.",
        teacherGuidance: `Use the teacher-selected strategy: ${strategy}`,
        learnerParticipation:
          "Invite the learner to explain the goal and choose how to begin.",
      },
      {
        id: crypto.randomUUID(),
        instruction: `Try a manageable part of the task: ${observation.activity}.`,
        teacherGuidance: strategy,
        learnerParticipation:
          "Provide an opportunity to try, ask for clarification, and explain their approach.",
      },
      {
        id: crypto.randomUUID(),
        instruction: "Review the agreed success criteria together.",
        teacherGuidance:
          "Record what happened and ask what support was useful. Decide together whether to repeat or adapt the activity.",
        learnerParticipation:
          "Invite the learner to share what helped and what they would change.",
      },
    ],
    supports: supportTypes.map(([type]) => ({
      type,
      enabled:
        !modified &&
        ((acceptedSupports[rule] ?? []).includes(type) ||
          (type === "visual" && visualRelevant)),
      description: descriptions[type],
    })),
    assessmentObservation:
      "Observe the agreed task step, the learner’s response, the support actually used, and their explanation. Record context rather than inferring a permanent trait.",
    successCriteria:
      "The learner attempts the agreed target step and demonstrates or explains their approach using the teacher-reviewed strategy. Teacher to define a specific, observable criterion for this lesson.",
    assessmentNotes: "",
    positiveFeedback:
      "Acknowledge an observed action: “You tried [specific step]. Tell me what helped.”",
    constructiveFeedback:
      "Offer a concrete next step: “Let’s look at [specific part] together and try a different approach.”",
    repeatOrModify:
      "Ask whether another attempt would be useful. The teacher may repeat, change support, shorten the task, or stop based on classroom evidence and learner feedback.",
    status: "draft",
    approvedAt: null,
    savedAt: null,
  };
}
