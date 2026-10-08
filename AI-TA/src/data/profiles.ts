import type { LearnerProfileData } from '../types';
export const mockProfiles: Record<string, LearnerProfileData> = {
  maya: {
    learnerCode: 'L-001', name: 'Maya Patel', grade: 'Year 4', age: 9, subject: 'English',
    strengths: ['Visual learning', 'Creativity', 'Communication'], otherStrength: '',
    supportNeeds: ['Task initiation', 'Written expression'], otherSupportNeed: '',
    interests: ['Drawing', 'Stories', 'Animals'], communicationPreferences: ['Visual instructions', 'Demonstration/model'],
    previousStrategies: ['Task breakdown', 'Modelling', 'Positive feedback'],
    teacherNotes: 'In this fictional example, Maya enjoys sharing ideas through drawings. A worked example has helped her begin independent writing.',
  },
  leo: {
    learnerCode: 'L-002', name: 'Leo Morgan', grade: 'Year 4', age: 9, subject: 'Mathematics',
    strengths: ['Hands-on learning', 'Pattern recognition', 'Problem solving'], otherStrength: '',
    supportNeeds: ['Communication'], otherSupportNeed: '',
    interests: ['Numbers', 'Vehicles', 'Sports'], communicationPreferences: ['Demonstration/model', 'Step-by-step instructions'],
    previousStrategies: ['Interest-based examples', 'Extra practice'],
    teacherNotes: 'In this fictional example, Leo enjoys exploring patterns with objects. Invite him to explain each step in his own words.',
  },
  amira: {
    learnerCode: 'L-003', name: 'Amira Khan', grade: 'Year 5', age: 10, subject: 'English',
    strengths: ['Verbal learning', 'Creativity'], otherStrength: '',
    supportNeeds: ['Participation'], otherSupportNeed: '',
    interests: ['Stories', 'Music'], communicationPreferences: ['Written instructions', 'Verbal instructions'],
    previousStrategies: ['Positive feedback', 'Task breakdown'],
    teacherNotes: 'In this fictional example, Amira enjoys creative writing. Preparation time has helped her contribute to group discussions.',
  },
};
