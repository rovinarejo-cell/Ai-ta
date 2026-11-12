interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  optional?: boolean;
}
export function PlanTextField({
  id,
  label,
  value,
  onChange,
  multiline = false,
  optional = false,
}: Props) {
  return (
    <div className="plan-field">
      <label htmlFor={id}>
        {label}
        {optional ? " (optional)" : ""}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          maxLength={5000}
          required={!optional}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          maxLength={500}
          required={!optional}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
