"use client";
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./password-input.css";

/** A password field with an eye button that shows or hides what was typed. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <span className="pw-field">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="pw-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
      >
        <Icon size={18} aria-hidden="true" />
      </button>
    </span>
  );
}
