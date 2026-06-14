import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

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
  const [visible, setVisible] = useState(true);
  const current = STEPS[step];

  const goTo = (next: number) => {
    setVisible(false);
    setTimeout(() => {
      setStep(next);
      setVisible(true);
    }, 100);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      goTo(step + 1);
    } else {
      markOnboarded();
      onFinish();
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, background:'#FAF6EF', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <div
        style={{
          display:'flex', flexDirection:'column', alignItems:'center', width:'100%',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateX(0)' : 'translateX(20px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        {/* Emoji */}
        <p style={{ fontSize:64, marginBottom:32, lineHeight:1 }}>{current.emoji}</p>

        {/* Progress dots */}
        <div style={{ display:'flex', gap:8, marginBottom:32 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width:10, height:10, borderRadius:'50%',
                background: i === step ? '#E8A87C' : '#EDE0D0',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div style={{ background:'#FFF8EE', border:'1px solid #EDE0D0', borderRadius:16, padding:24, width:320, marginBottom:32, boxSizing:'border-box' }}>
          <h2 style={{ fontSize:18, fontWeight:600, color:'#3D2C1E', margin:'0 0 4px 0' }}>
            {current.title}
          </h2>
          <p style={{ fontSize:14, color:'#E8A87C', margin:'0 0 12px 0' }}>{current.subtitle}</p>
          <p style={{ fontSize:14, color:'#8A7060', lineHeight:1.6, margin:0 }}>
            {current.body}
          </p>
        </div>

        {/* Bottom actions */}
        <div style={{ width:320, display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
          <div style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {step > 0 ? (
              <button
                onClick={() => goTo(step - 1)}
                style={{ background:'transparent', color:'#8A7060', border:'none', fontSize:14, cursor:'pointer', padding:'10px 12px', display:'flex', alignItems:'center', gap:4 }}
              >
                <ChevronLeft style={{ width:16, height:16 }} />
                上一步
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              style={{ background:'#E8A87C', color:'#fff', borderRadius:12, padding:'10px 28px', border:'none', fontSize:14, fontWeight:500, cursor:'pointer', minWidth:120 }}
            >
              {step < STEPS.length - 1 ? (
                <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                  下一步 <ChevronRight style={{ width:16, height:16 }} />
                </span>
              ) : (
                "开始使用"
              )}
            </button>
          </div>
          {step === STEPS.length - 1 && (
            <button
              onClick={() => { markOnboarded(); onFinish(); }}
              style={{
                background: 'transparent', border: 'none', color: '#8A7060',
                fontSize: 12, cursor: 'pointer', marginTop: 12, padding: '4px 8px',
                textDecoration: 'underline',
                textDecorationColor: 'rgba(138,112,96,0.3)',
              }}
            >
              不再提示
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
