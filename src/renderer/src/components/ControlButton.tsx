import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ControlButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'ghost';
}

export function ControlButton({ children, variant = 'default', className = '', ...rest }: ControlButtonProps) {
  const classes = ['control-button', `control-button--${variant}`, className].filter(Boolean).join(' ');

  return (
    <button className={classes} type="button" {...rest}>
      {children}
    </button>
  );
}
