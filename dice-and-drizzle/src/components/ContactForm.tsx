import { useState } from 'react';
import { submissions } from '@wix/forms';
import { createClient, OAuthStrategy } from '@wix/sdk';

const FORM_ID = '124b4f9e-9357-4907-b5e3-474620a5800e';

const wixClient = createClient({
  modules: { submissions },
  auth: OAuthStrategy({ clientId: import.meta.env.PUBLIC_WIX_CLIENT_ID }),
});

interface FormField {
  label: string;
  target: string;
  required: boolean;
  componentType: string;
  identifier: string;
  options?: { value: string; label: string }[];
}

interface ContactFormProps {
  formId?: string;
  fields?: FormField[];
}

export default function ContactForm({
  formId = FORM_ID,
  fields = [],
}: ContactFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (target: string, value: string) => {
    setFormData((prev) => ({ ...prev, [target]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setFieldErrors({});

    try {
      const result = await wixClient.submissions.createSubmission({
        formId,
        submissions: formData,
      });

      if (result.status === 'PENDING' || result.status === 'CONFIRMED') {
        setStatus('success');
        setFormData({});
      } else {
        setStatus('error');
      }
    } catch (err: unknown) {
      const violations =
        (err as any)?.details?.validationError?.fieldViolations ?? [];
      const errorMap: Record<string, string> = {};

      for (const v of violations) {
        const fieldErrs: { errorPath?: string; errorMessage?: string }[] =
          v?.data?.errors ?? [];
        for (const fe of fieldErrs) {
          if (fe.errorPath && !errorMap[fe.errorPath]) {
            errorMap[fe.errorPath] = fe.errorMessage ?? 'Invalid value';
          }
        }
      }

      if (Object.keys(errorMap).length > 0) {
        setFieldErrors(errorMap);
        setStatus('idle');
      } else {
        setStatus('error');
      }
    }
  };

  if (status === 'success') {
    return (
      <div className="form-success">
        Table booked. Pick your first game on the way in — the hot chocolate will
        be ready when you sit down.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      {fields.map((field) => (
        <div key={field.target} className="form-field">
          <label>
            {field.label}
            {field.required && (
              <span
                aria-hidden="true"
                style={{ color: 'var(--color-error)', marginLeft: '0.2em' }}
              >
                *
              </span>
            )}
          </label>

          {field.componentType === 'DROPDOWN' && field.options ? (
            <select
              required={field.required}
              value={formData[field.target] ?? ''}
              onChange={(e) => handleChange(field.target, e.target.value)}
              style={
                fieldErrors[field.target]
                  ? { borderColor: 'var(--color-error)' }
                  : undefined
              }
            >
              <option value="">Select an option</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.identifier === 'TEXT_AREA' || field.target === 'message' ? (
            <textarea
              required={field.required}
              value={formData[field.target] ?? ''}
              onChange={(e) => handleChange(field.target, e.target.value)}
              rows={5}
              style={
                fieldErrors[field.target]
                  ? { borderColor: 'var(--color-error)' }
                  : undefined
              }
            />
          ) : (
            <input
              type={
                field.target === 'email'
                  ? 'email'
                  : field.componentType === 'PHONE_INPUT'
                    ? 'tel'
                    : 'text'
              }
              required={field.required}
              value={formData[field.target] ?? ''}
              onChange={(e) => handleChange(field.target, e.target.value)}
              placeholder={
                field.componentType === 'PHONE_INPUT' ? '+354 000 0000' : undefined
              }
              style={
                fieldErrors[field.target]
                  ? { borderColor: 'var(--color-error)' }
                  : undefined
              }
            />
          )}

          {fieldErrors[field.target] && (
            <p
              style={{
                color: 'var(--color-error)',
                fontSize: '0.8125rem',
                marginTop: '0.25rem',
              }}
            >
              {fieldErrors[field.target]}
            </p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="form-submit-btn"
      >
        {status === 'submitting' ? 'Sending…' : 'Send message'}
      </button>

      {status === 'error' && (
        <div className="form-error">
          Something went wrong. Please try again, or reach us directly at{' '}
          <a
            href="mailto:hello@diceanddrizzle.is"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            hello@diceanddrizzle.is
          </a>
        </div>
      )}
    </form>
  );
}
