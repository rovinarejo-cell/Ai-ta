import { observationScale } from '../data/observationIndicators';
import type { IndicatorId } from '../data/observationIndicators';
import type { IndicatorObservation } from '../types';
export function ObservationRatingField({ id, label, value, onChange }: { id: IndicatorId; label: string; value: IndicatorObservation; onChange: (value: IndicatorObservation) => void }) {
  return <fieldset className="rating-field"><legend>{label}</legend>
    <div className="rating-options">{observationScale.map(level => <label className={`rating-option level-${level.value}`} key={level.value}>
      <input type="radio" name={`rating-${id}`} value={level.value} checked={value.rating === level.value} onChange={() => onChange({ ...value, rating: level.value })} />
      <span><strong>{level.value}</strong><small>{level.label}</small></span>
    </label>)}</div>
    <details className="indicator-note" open={value.note ? true : undefined}><summary>Teacher note (optional)</summary><label htmlFor={`note-${id}`}>Note for {label.toLowerCase()}</label><textarea id={`note-${id}`} rows={2} maxLength={1500} value={value.note} onChange={e => onChange({ ...value, note: e.target.value })} /></details>
  </fieldset>;
}
