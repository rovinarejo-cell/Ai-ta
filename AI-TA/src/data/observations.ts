import { indicatorGroups } from './observationIndicators';
import type { LearnerProfileData, TeacherObservationData } from '../types';
export function createObservation(learnerId: string, profile: LearnerProfileData): TeacherObservationData {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return {
    learnerId, context: { name: profile.name, learnerCode: profile.learnerCode, grade: profile.grade, subject: profile.subject },
    date, teacher: '', activity: '',
    ratings: Object.fromEntries(indicatorGroups.flatMap(group => group.indicators.map(indicator => [indicator.id, { rating: 0, note: '' }]))) as TeacherObservationData['ratings'],
    additionalObservation: '', observedStrengths: [], observedBarriers: [],
  };
}
