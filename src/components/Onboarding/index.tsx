import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "dusty-onboarded";

export function hasOnboarded(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboarded(): void {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

const STEPS = [
  {
    title: "Hi! I'm Dusty",
    subtitle: "Your cleanup buddy~",
    body: "Let's first check what's on your disk. I can help you find files to clean up safely.",
    emoji: "🧹",
  },
  {
    title: "Know Your Apps",
    subtitle: "Find unused software",
    body: "I've scanned all your installed apps. Pick anything you don't need, and I'll handle the deep cleaning.",
    emoji: "📋",
  },
  {
    title: "Ready to Sweep!",
    subtitle: "Let's start cleaning",
    body: "You can always undo within 7 days. Everything goes to a safe holding area first.",
    emoji: "✨",
  },
];

interface Props {
  onFinish: () => void;
}

export default function Onboarding({ onFinish }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      markOnboarded();
      onFinish();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          {/* Emoji + progress dots */}
          <p className="text-5xl mb-6">{current.emoji}</p>

          <div className="flex gap-1.5 mb-8">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-1">
            {current.title}
          </h2>
          <p className="text-xs text-primary mb-3">{current.subtitle}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {current.body}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-background to-transparent flex items-center justify-between max-w-sm mx-auto">
        {step > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
            <ChevronLeft /> Back
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={handleNext} className="rounded-xl">
          {step < STEPS.length - 1 ? (
            <>Next <ChevronRight /></>
          ) : (
            "Get Started"
          )}
        </Button>
      </div>
    </div>
  );
}
