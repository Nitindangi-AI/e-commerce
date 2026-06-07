import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const OTPInput = forwardRef(({ length = 6, onComplete, disabled, shake, onReset }, ref) => {
  const inputsRef = useRef([]);

  useEffect(() => {
    // Auto-focus first input on mount
    setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 100);
  }, []);

  const reset = () => {
    inputsRef.current.forEach(input => {
      if (input) input.value = '';
    });
    inputsRef.current[0]?.focus();
    onReset?.();
  };

  useImperativeHandle(ref, () => ({
    reset
  }));

  // Auto-clear inputs and focus first box on shake (OTP invalid)
  useEffect(() => {
    if (shake) {
      reset();
    }
  }, [shake]);

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, ''); 
    e.target.value = val;

    if (val && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    triggerCompleteCheck();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!e.target.value && index > 0) {
        inputsRef.current[index - 1].value = '';
        inputsRef.current[index - 1]?.focus();
      } else {
        e.target.value = '';
      }
      triggerCompleteCheck();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length).replace(/\D/g, '');
    for (let i = 0; i < Math.min(pastedData.length, length); i++) {
      if (inputsRef.current[i]) {
        inputsRef.current[i].value = pastedData[i];
      }
    }
    const nextFocusIndex = Math.min(pastedData.length, length - 1);
    inputsRef.current[nextFocusIndex]?.focus();
    triggerCompleteCheck();
  };

  const triggerCompleteCheck = () => {
    const otp = inputsRef.current.map(input => input?.value || '').join('');
    if (otp.length === length) {
      onComplete?.(otp);
    }
  };

  return (
    <div className={`flex gap-3 justify-center ${shake ? 'animate-shake' : ''}`}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={el => inputsRef.current[index] = el}
          type="text"
          maxLength={1}
          disabled={disabled}
          onChange={e => handleChange(e, index)}
          onKeyDown={e => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-14 h-16 text-center text-xl font-bold bg-[#FAFAF8] dark:bg-[#151515] border border-[#E8E8E8] dark:border-white/10 rounded-xl focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] disabled:opacity-50 transition-all font-sans text-black dark:text-white border-b-2 border-b-[#E8E8E8] focus:border-b-[#C9A84C]"
        />
      ))}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake input {
          border-color: #EF4444 !important;
          border-bottom-color: #EF4444 !important;
          box-shadow: 0 0 0 1px #EF4444 !important;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
});

OTPInput.displayName = 'OTPInput';

export default OTPInput;
