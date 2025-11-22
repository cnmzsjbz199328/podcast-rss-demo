import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

const Card = ({
  children,
  className = '',
  clickable = false,
  onClick,
  padding = 'md',
  shadow = true,
}: CardProps) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const baseClasses = `rounded-lg bg-white dark:bg-card-dark ${shadow ? 'shadow-sm dark:shadow-none' : ''} ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`;

  return (
    <div
      className={`${baseClasses} ${paddingClasses[padding]} ${className}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default Card;
