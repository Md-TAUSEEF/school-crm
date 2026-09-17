import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
  ...props
}) {
  const variants = {
    primary:
      "bg-slate-950 text-white hover:bg-slate-800 border border-slate-950",
    secondary:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger:
      "bg-red-600 text-white border border-red-600 hover:bg-red-700",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl px-4 py-2.5
        text-sm font-semibold
        transition
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${variants[variant] || variants.primary}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

export function Loading({ message = "Loading..." }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Loader2 size={20} className="animate-spin" />
        {message}
      </div>
    </div>
  );
}

export function Empty({
  title = "No data found",
  message = "There are no records to display.",
  action = null,
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <AlertCircle size={22} />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "Unable to load the requested data.",
  onRetry,
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-red-600">
          <AlertCircle size={20} />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-red-900">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-red-700">
            {message}
          </p>

          {onRetry && (
            <Button
              variant="secondary"
              onClick={onRetry}
              className="mt-4 border-red-200 bg-white text-red-700 hover:bg-red-50"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  intro,
  actions = null,
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>

        {intro && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {intro}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}