type DustyState = "idle" | "sweeping" | "celebrate" | "warning";

interface DustyProps {
  state: DustyState;
  size?: number;
}

const STATE_IMAGES: Record<DustyState, string> = {
  idle: "/dusty/idle.png",
  sweeping: "/dusty/sweeping.png",
  celebrate: "/dusty/celebrate.png",
  warning: "/dusty/warning.png",
};

const STATE_BLEND: Record<DustyState, string> = {
  idle: "screen",
  sweeping: "screen",
  celebrate: "screen",
  warning: "multiply",
};

const ANIMATIONS: Record<DustyState, React.CSSProperties["animation"]> = {
  idle: "dusty-idle 2.5s ease-in-out infinite",
  sweeping: "dusty-sweep 0.8s ease-in-out infinite",
  celebrate: "dusty-celebrate 0.6s ease-in-out infinite",
  warning: "dusty-warning 1.2s ease-in-out infinite",
};

export type { DustyState };

export default function Dusty({ state, size = 36 }: DustyProps) {
  return (
    <>
      <style>{`
        @keyframes dusty-idle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes dusty-sweep {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes dusty-celebrate {
          0% { transform: translateY(0px) scale(1); }
          40% { transform: translateY(-8px) scale(1.05); }
          100% { transform: translateY(0px) scale(1); }
        }
        @keyframes dusty-warning {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
      `}</style>
      <img
        src={STATE_IMAGES[state]}
        alt={`Dusty ${state}`}
        width={size}
        height={size}
        style={{
          mixBlendMode: STATE_BLEND[state] as React.CSSProperties["mixBlendMode"],
          animation: ANIMATIONS[state],
        }}
      />
    </>
  );
}
