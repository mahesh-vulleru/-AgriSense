export const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[#17251B] mb-1.5 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] disabled:bg-slate-50 disabled:text-slate-400 ${
            Icon ? 'pl-9' : ''
          } ${
            error
              ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
              : 'border-slate-200 hover:border-slate-300'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;

