import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { SelectionGroup } from '../components/SelectionGroup';
import { communicationOptions, interestOptions, strategyOptions, strengthOptions, supportOptions } from '../data/profileOptions';
import type { LearnerProfileData } from '../types';

interface Props {
  learnerId: string;
  profile: LearnerProfileData;
  onSave: (profile: LearnerProfileData) => void;
}

export function LearnerProfile({ learnerId, profile, onSave }: Props) {
  const [draft, setDraft] = useState<LearnerProfileData>(profile);
  const [customInterest, setCustomInterest] = useState('');
  const [addedInterests, setAddedInterests] = useState(profile.interests.filter(value => !interestOptions.includes(value)));
  const [message, setMessage] = useState('');
  const [interestError, setInterestError] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile) || customInterest.trim() !== '';
  const change = <K extends keyof LearnerProfileData>(field: K, value: LearnerProfileData[K]) => {
    setDraft(previous => ({ ...previous, [field]: value }));
    setMessage('');
  };
  const addInterest = () => {
    const value = customInterest.trim();
    if (!value) { setInterestError('Enter an interest before adding it.'); return; }
    if ([...interestOptions, ...addedInterests].some(item => item.toLowerCase() === value.toLowerCase())) {
      const existing = [...interestOptions, ...addedInterests].find(item => item.toLowerCase() === value.toLowerCase())!;
      if (!draft.interests.includes(existing)) change('interests', [...draft.interests, existing]);
      setMessage('That interest is already available and has been selected.');
    } else { setAddedInterests(previous => [...previous, value]); change('interests', [...draft.interests, value]); }
    setCustomInterest(''); setInterestError('');
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (customInterest.trim()) { setInterestError('Add this interest or clear the field before saving.'); return; }
    const cleaned = { ...draft, learnerCode: draft.learnerCode.trim(), name: draft.name.trim(), grade: draft.grade.trim(), subject: draft.subject.trim(),
      otherStrength: draft.strengths.includes('Other strength') ? draft.otherStrength.trim() : '',
      otherSupportNeed: draft.supportNeeds.includes('Other support need') ? draft.otherSupportNeed.trim() : '', teacherNotes: draft.teacherNotes.trim() };
    if (![cleaned.learnerCode, cleaned.name, cleaned.grade, cleaned.subject].every(Boolean)) { setMessage('Enter a value for each required basic information field.'); return; }
    onSave(cleaned); setDraft(cleaned); setMessage('Profile saved for this session. You can now continue to Teacher Observation.');
  };
  const cancel = () => { setDraft(profile); setAddedInterests(profile.interests.filter(value => !interestOptions.includes(value))); setCustomInterest(''); setInterestError(''); setMessage('Unsaved changes discarded. Your last saved profile is restored.'); };
  const customOptions = addedInterests;
  return <form className="profile-form" onSubmit={save}>
    <div className="profile-intro"><span className="pill subtle">Fictional learner · Editable profile</span><p>Select all that apply. Record observed strengths and support needs in context; these selections do not define fixed learner traits.</p></div>
    <section className="card profile-section" aria-labelledby="basic-heading">
      <h2 id="basic-heading">A. Basic Information</h2><p>All basic information fields are required. Use fictional information in this prototype.</p>
      <div className="profile-fields">
        <div><label htmlFor="learner-code">Learner Code</label><input id="learner-code" required maxLength={40} value={draft.learnerCode} onChange={e => change('learnerCode', e.target.value)} /></div>
        <div><label htmlFor="learner-name">Learner Name</label><input id="learner-name" required maxLength={100} value={draft.name} onChange={e => change('name', e.target.value)} /></div>
        <div><label htmlFor="learner-grade">Class/Grade</label><input id="learner-grade" required maxLength={60} value={draft.grade} onChange={e => change('grade', e.target.value)} /></div>
        <div><label htmlFor="learner-age">Age (years)</label><input id="learner-age" type="number" required min={1} max={100} step={1} value={Number.isNaN(draft.age) ? '' : draft.age} onChange={e => change('age', e.target.valueAsNumber)} /></div>
        <div className="full-width"><label htmlFor="learner-subject">Subject currently being supported</label><input id="learner-subject" required maxLength={100} value={draft.subject} onChange={e => change('subject', e.target.value)} /></div>
      </div>
    </section>
    <SelectionGroup legend="B. Learning Strengths" description="Select strengths you have observed. Preferences may vary across tasks and settings." options={strengthOptions} selected={draft.strengths} onChange={value => change('strengths', value)} />
    {draft.strengths.includes('Other strength') && <div className="card custom-detail"><label htmlFor="other-strength">Describe another observed strength</label><input id="other-strength" required maxLength={200} value={draft.otherStrength} onChange={e => change('otherStrength', e.target.value)} /></div>}
    <SelectionGroup legend="C. Areas Requiring Support" description="Learning/support observations only. These are not diagnoses or diagnostic indicators." options={supportOptions} selected={draft.supportNeeds} onChange={value => change('supportNeeds', value)} />
    {draft.supportNeeds.includes('Other support need') && <div className="card custom-detail"><label htmlFor="other-support">Describe another support observation</label><input id="other-support" required maxLength={200} value={draft.otherSupportNeed} onChange={e => change('otherSupportNeed', e.target.value)} /></div>}
    <section className="interest-section">
      <SelectionGroup legend="D. Learner Interests" description="Select interests or add a custom interest using the field below. Added interests can be deselected." options={[...interestOptions, ...customOptions]} selected={draft.interests} onChange={value => change('interests', value)} />
      <div className="card custom-detail"><label htmlFor="custom-interest">Other / custom interest</label><div className="interest-add"><input id="custom-interest" maxLength={80} value={customInterest} aria-invalid={Boolean(interestError)} aria-describedby="interest-feedback" onChange={e => { setCustomInterest(e.target.value); setInterestError(''); setMessage(''); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }} /><button className="button secondary" type="button" onClick={addInterest}>Add interest</button></div><p id="interest-feedback" role="status">{interestError || 'Add a custom interest before saving the profile.'}</p></div>
    </section>
    <SelectionGroup legend="E. Communication Preferences" description="Choose all approaches that have helped the learner access instructions." options={communicationOptions} selected={draft.communicationPreferences} onChange={value => change('communicationPreferences', value)} />
    <SelectionGroup legend="F. Previous Support / Strategies" description="Select strategies that have previously been useful. Add context in Teacher Notes." options={strategyOptions} selected={draft.previousStrategies} onChange={value => change('previousStrategies', value)} />
    <section className="card profile-section" aria-labelledby="notes-heading"><h2 id="notes-heading">G. Teacher Notes</h2><label htmlFor="teacher-notes">Additional observations</label><textarea id="teacher-notes" rows={5} maxLength={5000} value={draft.teacherNotes} onChange={e => change('teacherNotes', e.target.value)} /><p className="profile-help">Describe the task, setting, and support that helped. Avoid sensitive or diagnostic information in this demo.</p></section>
    <section className="note privacy-note" aria-labelledby="privacy-heading"><h2 id="privacy-heading">H. Research/Privacy Note</h2><p>Information recorded here is intended to support teacher decision-making. The AI-TA does not diagnose learners. The teacher remains responsible for interpreting observations and making instructional decisions.</p><p>Saved information stays in this browser session’s memory and is cleared on refresh.</p></section>
    <div className="profile-actions"><div className="form-actions"><button type="submit" className="button">Save profile</button><button type="button" className="button secondary" onClick={cancel}>Cancel</button></div><p role="status" aria-live="polite">{message || (dirty ? 'You have unsaved changes.' : 'Profile matches the current session data.')}</p>
      {dirty ? <button className="button secondary" disabled type="button">Continue to Teacher Observation →</button> : <Link className="button" to={`/learners/${learnerId}/observation`}>Continue to Teacher Observation →</Link>}
      <p className="profile-help">Save or cancel edits before continuing. Teacher Observation is the next workflow stage.</p>
    </div>
  </form>;
}
