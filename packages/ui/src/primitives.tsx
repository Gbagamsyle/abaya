import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "text";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner label="Loading" /> : leadingIcon}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button className={`ui-icon-button ${className}`.trim()} aria-label={label} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <a
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      href={href}
    >
      {children}
    </a>
  );
}

export function FieldLabel({
  children,
  required,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className="ui-label" {...props}>
      {children}
      {required && (
        <span aria-hidden="true" className="ui-required">
          {" "}
          *
        </span>
      )}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`.trim()} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-input ui-textarea ${className}`.trim()} {...props} />;
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`ui-input ui-select ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="ui-choice">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Radio({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="ui-choice">
      <input type="radio" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: {
    id: string;
    required?: boolean;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="ui-field">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {children({
        id,
        required,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p className="ui-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="ui-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "destructive";
}) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function Price({
  amount,
  currency,
  locale = "en",
  compareAt,
  className = "",
}: {
  amount: number;
  currency: string;
  locale?: string;
  compareAt?: number;
  className?: string;
}) {
  return (
    <span className={`ui-price ${className}`.trim()}>
      <span>{new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount)}</span>
      {compareAt !== undefined && compareAt > amount && (
        <del className="ui-price__compare">
          {new Intl.NumberFormat(locale, { style: "currency", currency }).format(compareAt)}
        </del>
      )}
    </span>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`ui-divider ${className}`.trim()} />;
}

export function Container({
  children,
  width = "content",
  className = "",
}: {
  children: ReactNode;
  width?: "content" | "wide" | "reading";
  className?: string;
}) {
  return (
    <div className={`ui-container ui-container--${width} ${className}`.trim()}>{children}</div>
  );
}

export function Section({ children, className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={`ui-section ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function Stack({
  children,
  gap = "md",
  className = "",
}: {
  children: ReactNode;
  gap?: "sm" | "md" | "lg";
  className?: string;
}) {
  return <div className={`ui-stack ui-stack--${gap} ${className}`.trim()}>{children}</div>;
}

export function Inline({
  children,
  gap = "md",
  className = "",
}: {
  children: ReactNode;
  gap?: "sm" | "md" | "lg";
  className?: string;
}) {
  return <div className={`ui-inline ui-inline--${gap} ${className}`.trim()}>{children}</div>;
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="ui-visually-hidden">{children}</span>;
}

export function Skeleton({
  className = "",
  label = "Loading content",
}: {
  className?: string;
  label?: string;
}) {
  return <span className={`ui-skeleton ${className}`.trim()} role="status" aria-label={label} />;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <span className="ui-spinner" role="status" aria-label={label} />;
}

export function Alert({
  children,
  tone = "info",
  title,
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "destructive";
  title?: string;
}) {
  return (
    <div
      className={`ui-alert ui-alert--${tone}`}
      role={tone === "destructive" ? "alert" : "status"}
    >
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ui-empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="ui-breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href && index < items.length - 1 ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
