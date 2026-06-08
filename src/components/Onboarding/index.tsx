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
    title: "嗨！我是 Dusty",
    subtitle: "你的专属清洁工～",
    body: "先来看看磁盘里有什么吧！我会帮你找到可以安全清理的文件。",
    emoji: "🧹",
  },
  {
    title: "认识你的软件",
    subtitle: "找找不需要的应用",
    body: "我已经列出了所有已安装的软件。挑出不想要的，剩下的深度清理交给我就好。",
    emoji: "📋",
  },
  {
    title: "准备好了吗？",
    subtitle: "清扫开始！",
    body: "别担心，所有删除的内容都会先放进暂存区，7天内随时可以还原～",
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
          className="flex flex-col items-center text-center w-full max-w-sm"
        >
          {/* Emoji */}
          <p className="text-6xl mb-8">{current.emoji}</p>

          {/* Progress dots */}
          <div className="flex gap-2 mb-8">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-2xl p-6 w-full mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {current.title}
            </h2>
            <p className="text-sm text-primary mb-3">{current.subtitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.body}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent flex items-center justify-between max-w-sm mx-auto w-full">
        {step > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
            <ChevronLeft /> 上一步
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={handleNext} className="rounded-xl min-w-[120px]">
          {step < STEPS.length - 1 ? (
            <>下一步 <ChevronRight /></>
          ) : (
            "开始使用"
          )}
        </Button>
      </div>
    </div>
  );
}
