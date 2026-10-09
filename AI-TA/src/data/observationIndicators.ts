export const indicatorGroups = [
  { title: 'Task Engagement', indicators: [
    { id: 'taskInitiation', label: 'Task initiation' },
    { id: 'sustainedAttention', label: 'Sustained attention' },
    { id: 'taskCompletion', label: 'Task completion' },
    { id: 'participation', label: 'Participation' },
  ] },
  { title: 'Instructional Response', indicators: [
    { id: 'followingInstructions', label: 'Following instructions' },
    { id: 'respondingToPrompts', label: 'Responding to prompts' },
    { id: 'workingIndependently', label: 'Working independently' },
  ] },
  { title: 'Cognitive/Learning Behaviours', indicators: [
    { id: 'understandingTask', label: 'Understanding the task' },
    { id: 'memoryRecall', label: 'Memory/recall' },
    { id: 'problemSolving', label: 'Problem solving' },
    { id: 'readingMeaning', label: 'Reading/meaning-making where relevant' },
  ] },
  { title: 'Communication', indicators: [
    { id: 'expressingNeeds', label: 'Expressing needs' },
    { id: 'respondingToTeacher', label: 'Responding to teacher' },
    { id: 'classroomInteraction', label: 'Peer/classroom interaction' },
  ] },
  { title: 'Learning Environment', indicators: [
    { id: 'visualSupports', label: 'Response to visual supports' },
    { id: 'verbalInstructions', label: 'Response to verbal instructions' },
    { id: 'taskComplexity', label: 'Response to task complexity' },
    { id: 'environmentalConditions', label: 'Response to sensory/environmental conditions' },
  ] },
] as const;
export type IndicatorId = typeof indicatorGroups[number]['indicators'][number]['id'];
export const observationScale = [
  { value: 0, label: 'Not observed' },
  { value: 1, label: 'Requires substantial support' },
  { value: 2, label: 'Requires occasional support' },
  { value: 3, label: 'Independent/consistent' },
] as const;
export const observationPrinciple = 'These observations describe classroom learning behaviour and support needs. They are not diagnostic assessments. The AI-TA uses teacher-provided observations to support instructional decision-making.';
