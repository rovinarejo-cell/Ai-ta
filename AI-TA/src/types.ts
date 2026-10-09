export interface Learner { id: string; name: string; initials: string; grade: string; focus: string; strengths: string[]; }
export type Decision = 'accept' | 'modify' | 'reject';
export interface LearnerWork { observation: string; decision?: Decision; modification: string; }

/** Teacher-recorded classroom context; no diagnostic or inferred attributes. */
export interface LearnerProfileData {
  learnerCode: string;
  name: string;
  grade: string;
  age: number;
  subject: string;
  strengths: string[];
  otherStrength: string;
  supportNeeds: string[];
  otherSupportNeed: string;
  interests: string[];
  communicationPreferences: string[];
  previousStrategies: string[];
  teacherNotes: string;
}

export type ObservationRating = 0 | 1 | 2 | 3;
export interface IndicatorObservation { rating: ObservationRating; note: string; }
export interface TeacherObservationData {
  learnerId: string;
  /** Snapshot of saved profile context at observation time. */
  context: Pick<LearnerProfileData, 'name' | 'learnerCode' | 'grade' | 'subject'>;
  date: string;
  teacher: string;
  activity: string;
  ratings: Record<import('./data/observationIndicators').IndicatorId, IndicatorObservation>;
  additionalObservation: string;
  observedStrengths: string[];
  observedBarriers: string[];
}
