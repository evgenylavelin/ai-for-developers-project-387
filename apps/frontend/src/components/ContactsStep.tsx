type ContactsStepProps = {
  name: string;
  email: string;
  error?: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
};

export function ContactsStep({
  name,
  email,
  error,
  onNameChange,
  onEmailChange,
}: ContactsStepProps) {
  return (
    <div className="stack">
      <label className="field">
        <span>Имя</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </label>

      {error ? <p className="error-copy">{error}</p> : null}
    </div>
  );
}
