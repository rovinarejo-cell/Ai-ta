export interface Learner { id: string; name: string; initials: string; grade: string; focus: string; strengths: string[]; }
export type Decision = 'accept' | 'modify' | 'reject';
export interface LearnerWork { observation: string; decision?: Decision; modification: string; }
