import { useState, type FormEvent } from "react";
import { submissions } from "@wix/forms";
import { trackEvent } from "../utils/analytics";

interface FormField {
  label: string;
  target: string;
  required: boolean;
  componentType: string;
  identifier?: string;
  options?: { value: string; label: string }[];
}

interface ContactFormProps {
  formId: string;
  fields: FormField[];
}

export default function ContactForm({ formId, fields }: ContactFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setFieldErrors({});

    try {
      const result = await submissions.createSubmission({
        formId,
        submissions: formData,
      });

      if (result.status === "PENDING" || result.status === "CONFIRMED") {
        trackEvent("FormSubmit", { formId });
        setStatus("success");
        setFormData({});
      } else {
        setStatus("error");
      }
    } catch (err: unknown) {
      const violations =
        (err as { details?: { validationError?: { fieldViolations?: unknown[] } } })
          ?.details?.validationError?.fieldViolations ?? [];
      const errorMap: Record<string, string> = {};

      for (const v of violations) {
        const fieldErrs: { errorPath?: string; errorMessage?: string }[] =
          (v as { data?: { errors?: { errorPath?: string; errorMessage?: string }[] } })
            ?.data?.errors ?? [];
        for (const fe of fieldErrs) {
          if (fe.errorPath && !errorMap[fe.errorPath]) {
            errorMap[fe.errorPath] = fe.errorMessage ?? "Invalid value";
          }
        }
      }

      if (Object.keys(errorMap).length > 0) {
        setFieldErrors(errorMap);
        setStatus("idle");
      } else {
        setStatus("error");
      }
    }
  };

  if (status === "success") {
    return (
      <div className="form-success">
        Thank you! We'll be in touch soon.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form-container">
      {fields.map((field) => (
        <div key={field.target} className="form-field">
          <label className="form-label">
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>
          {field.componentType === "DROPDOWN" && field.options ? (
            <select
              required={field.required}
              value={formData[field.target] ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [field.target]: e.target.value }))
              }
              className={`form-select${fieldErrors[field.target] ? " form-input-error" : ""}`}
            >
              <option value="">Select an option</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : field.identifier === "TEXT_AREA" || field.target === "message" ? (
            <textarea
              required={field.required}
              value={formData[field.target] ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [field.target]: e.target.value }))
              }
              rows={4}
              className={`form-textarea${fieldErrors[field.target] ? " form-input-error" : ""}`}
            />
          ) : (
            <input
              type={
                field.target === "email" ? "email" :
                field.componentType === "PHONE_INPUT" ? "tel" : "text"
              }
              required={field.required}
              value={formData[field.target] ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [field.target]: e.target.value }))
              }
              className={`form-input${fieldErrors[field.target] ? " form-input-error" : ""}`}
              {...(field.componentType === "PHONE_INPUT" ? { placeholder: "+1234567890" } : {})}
            />
          )}
          {fieldErrors[field.target] && (
            <p className="form-field-error">{fieldErrors[field.target]}</p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="form-button"
      >
        {status === "submitting" ? "Sending..." : "Send Message"}
      </button>

      {status === "error" && (
        <p className="form-error">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
