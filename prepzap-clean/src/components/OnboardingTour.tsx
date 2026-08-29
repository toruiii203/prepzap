import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function OnboardingTour() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user profile exists, onboarding is complete, and they haven't seen it yet
    if (profile && profile.onboarding_complete && !localStorage.getItem('tour_seen')) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const steps = [
    {
      title: 'Welcome to Studenius! \uD83E\uDD8A',
      desc: 'Let’s take a quick 10-second tour to unlock your full potential.',
      action: 'Next'
    },
    {
      title: 'Your AI Tutor',
      desc: 'Rex is here 24/7 to explain complex topics like you’re 5 years old.',
      action: 'Next'
    },
    {
      title: 'Spaced Repetition Flashcards',
      desc: 'Turn your messy notes into structured flashcards that guarantee you never forget.',
      action: 'Next'
    },
    {
      title: 'Pro Tip: Cmd+K',
      desc: 'Press Cmd+K (or Ctrl+K) anywhere to instantly jump between tools.',
      action: 'Get Started'
    }
  ];

  if (!visible) return null;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      localStorage.setItem('tour_seen', 'true');
      setVisible(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] max-w-sm w-full p-6 animate-pop-in relative">
        {/* Step Indicator */}
        <div className="absolute -top-4 -right-4 w-10 h-10 bg-[#FFE566] border-2 border-black rounded-full flex items-center justify-center font-black shadow-[2px_2px_0px_#000]">
          {step + 1}/{steps.length}
        </div>
        
        <h2 className="text-[20px] font-black uppercase tracking-tight mb-2">{steps[step].title}</h2>
        <p className="text-[14px] font-bold text-black/70 mb-8 leading-relaxed">
          {steps[step].desc}
        </p>
        
        <div className="flex justify-between items-center">
          <button 
            onClick={() => {
              localStorage.setItem('tour_seen', 'true');
              setVisible(false);
            }} 
            className="text-[11px] font-black uppercase text-black/40 hover:text-black tracking-widest"
          >
            Skip Tour
          </button>
          
          <button 
            onClick={handleNext}
            className="px-6 py-2 bg-[#E8534A] text-white font-black text-[14px] border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all"
          >
            {steps[step].action}
          </button>
        </div>
      </div>
    </div>
  );
}
