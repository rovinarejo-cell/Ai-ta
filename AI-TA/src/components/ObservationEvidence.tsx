import { useState } from 'react';
import { SelectionGroup } from './SelectionGroup';
export function ObservationEvidence({ legend, options, selected, onChange, id }: { legend: string; options: string[]; selected: string[]; onChange: (values: string[]) => void; id: string }) {
  const [custom, setCustom] = useState('');
  const [added, setAdded] = useState(selected.filter(value => !options.includes(value)));
  const [message, setMessage] = useState('');
  const add = () => {
    const value = custom.trim();
    if (!value) { setMessage('Enter an observation to add.'); return; }
    const existing = [...options, ...added].find(item => item.toLowerCase() === value.toLowerCase());
    const entry = existing ?? value;
    if (!existing) setAdded(previous => [...previous, entry]);
    if (!selected.includes(entry)) onChange([...selected, entry]);
    setCustom(''); setMessage('Observation added and selected.');
  };
  return <div className="evidence-section"><SelectionGroup legend={legend} description="Optional. Select or add what you observed in this activity; these are not diagnoses." options={[...options, ...added]} selected={selected} onChange={onChange} /><div className="card custom-detail"><label htmlFor={id}>Add a custom observation</label><div className="interest-add"><input id={id} maxLength={150} value={custom} onChange={e => { setCustom(e.target.value); setMessage(''); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /><button type="button" className="button secondary" onClick={add}>Add observation</button></div><p role="status">{message || 'Use Add observation to include this text in the saved selections.'}</p></div></div>;
}
