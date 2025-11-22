import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  fullWidth = false,
  icon,
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80',
    secondary: 'bg-white/10 text-white hover:bg-white/20 active:bg-white/10 dark:bg-slate-800 dark:hover:bg-slate-700',
    ghost: 'text-white hover:bg-white/10 active:bg-white/5 dark:hover:bg-white/5',
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm h-8 min-w-[72px]',
    medium: 'px-4 py-2.5 text-base h-10 min-w-[84px]',
    large: 'px-6 py-3.5 text-base h-14 min-w-[120px]',
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
    >
      {icon && <span>{icon}</span>}
      {loading ? '加载中...' : children}
    </button>
  );
};

export default Button;
