import React from 'react';
import { Check, X } from 'lucide-react';

export default function PasswordStrengthMeter({ password = '' }) {
  const criteria = [
    { label: 'Min. 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one number', met: /[0-9]/.test(password) },
    { label: 'At least one special character', met: /[^A-Za-z0-9]/.test(password) }
  ];

  const score = criteria.filter(c => c.met).length;

  const getStrengthLabel = (s) => {
    if (!password) return '';
    if (s <= 1) return 'Weak';
    if (s === 2) return 'Fair';
    if (s === 3) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = (s) => {
    if (s <= 1) return 'bg-red-500';
    if (s === 2) return 'bg-orange-500';
    if (s === 3) return 'bg-yellow-500';
    return 'bg-[#C9A84C]'; // Premium Gold for strong passwords
  };

  const label = getStrengthLabel(score);

  return (
    <div className="mt-2.5 w-full font-sans">
      <div className="flex gap-1.5 h-1.5 w-full rounded bg-gray-200 dark:bg-neutral-800 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`h-full flex-1 transition-all duration-300 ${
              index < score ? getStrengthColor(score) : 'bg-transparent'
            }`}
          />
        ))}
      </div>
      {password && (
        <div className="mt-2 space-y-2">
          <div className="text-xs font-semibold flex justify-between items-center text-neutral-600 dark:text-neutral-400">
            <span>Password strength:</span>
            <span className={`font-bold ${
              score <= 1 ? 'text-red-500' :
              score === 2 ? 'text-orange-500' :
              score === 3 ? 'text-yellow-500' :
              'text-[#C9A84C]'
            }`}>
              {label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 border-t border-gray-100 dark:border-white/5">
            {criteria.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] font-medium transition-all">
                {c.met ? (
                  <Check size={11} className="text-[#C9A84C] stroke-[3]" />
                ) : (
                  <X size={11} className="text-gray-300 dark:text-neutral-700 stroke-[2.5]" />
                )}
                <span className={c.met ? 'text-[#C9A84C]' : 'text-gray-400 dark:text-neutral-500'}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
