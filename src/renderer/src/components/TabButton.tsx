import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface TabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
}

export function TabButton({ children, active = false, className = '', ...rest }: TabButtonProps) {
  return (
    <button
      type="button"
      className={['tab-button', active ? 'tab-button--active' : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
