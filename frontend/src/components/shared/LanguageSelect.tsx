import { LANGUAGES } from '../../lib/constants';

interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function LanguageSelect({ value, onChange, className = '' }: LanguageSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${className}`}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
}
