interface Props {
  legend: string;
  description: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}
/** Native checkboxes retain keyboard and screen-reader behavior. */
export function SelectionGroup({ legend, description, options, selected, onChange }: Props) {
  return <fieldset className="profile-section card">
    <legend>{legend}</legend>
    <p>{description}</p>
    <div className="selection-grid">{options.map(option => <label className="selection-option" key={option}>
      <input type="checkbox" checked={selected.includes(option)} onChange={e => onChange(e.target.checked ? [...selected, option] : selected.filter(value => value !== option))} />
      <span>{option}</span>
    </label>)}</div>
  </fieldset>;
}
