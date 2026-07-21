import { useState } from "react";
import { submissions } from "@wix/forms";

interface FormField {
  label: string;
  target: string;
  required: boolean;
  componentType: string;
  identifier?: string;
}

interface ContactFormProps {
  formId: string;
  fields: FormField[];
}

export default function ContactForm({ formId, fields }: ContactFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const isTextarea = (f: FormField) =>
    f.identifier === "TEXT_AREA" ||
    f.target === "message" ||
    /message/i.test(f.label);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const result = await submissions.createSubmission({ formId, submissions: formData });
      if (result.status === "PENDING" || result.status === "CONFIRMED") {
        setStatus("success");
        setFormData({});
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error("[contact] submit failed:", err);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="form-status" data-state="success">
        Inquiry received. We read every one and respond within 48 hours — usually sooner when the kitchen is quiet.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div key={field.target} className="form-field">
          <label htmlFor={`cf-${field.target}`}>
            {field.label}{field.required ? " *" : ""}
          </label>
          {isTextarea(field) ? (
            <textarea
              id={`cf-${field.target}`}
              required={field.required}
              value={formData[field.target] ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, [field.target]: e.target.value }))}
            />
          ) : (
            <input
              id={`cf-${field.target}`}
              type={field.target === "email" ? "email" : field.componentType === "PHONE_INPUT" ? "tel" : "text"}
              required={field.required}
              value={formData[field.target] ?? ""}
              onChange={(e) => setFormData((p) => ({ ...p, [field.target]: e.target.value }))}
            />
          )}
        </div>
      ))}

      <button type="submit" className="btn-primary" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send inquiry"}
      </button>
      <p className="form-reassurance">
        No obligation, no spam. We only use your email to reply to this inquiry and, if you opt in, to notify you when new dinner dates open.
      </p>

      {status === "error" && (
        <div className="form-status" data-state="error">
          Something went wrong sending your inquiry. Please try again in a moment.
        </div>
      )}
    </form>
  );
}
