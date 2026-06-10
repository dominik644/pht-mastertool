interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glow?: boolean;
}

export function Card({ children, className = '', onClick, glow }: CardProps) {
  return (
    <div
      className={`bg-dark-700/80 rounded-xl border border-dark-500/60 backdrop-blur-sm ${
        glow ? 'shadow-lg shadow-pht-600/10' : 'shadow-sm'
      } ${onClick ? 'cursor-pointer hover:border-pht-500/40 hover:shadow-pht-600/10 transition-all' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 pt-5 pb-2 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}
