import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'black';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  size = 'md',
  icon,
  className = '',
  ...props 
}) => {
  // Duck School style: High contrast, borders, pill shapes
  const baseStyles = "inline-flex items-center justify-center rounded-full font-bold tracking-tight transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border whitespace-nowrap";
  
  const variants = {
    // Lime background, Black Text, thin black border
    primary: "bg-brand-lime text-brand-black border-brand-black hover:bg-white hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]",
    
    // Solid Black
    black: "bg-brand-black text-brand-lime border-brand-black hover:bg-gray-800",
    
    // White background, Black border
    secondary: "bg-white text-brand-black border-brand-black hover:bg-brand-gray",
    
    // Outlined transparent
    outline: "bg-transparent border-brand-black text-brand-black hover:bg-brand-lime",
    
    // Ghost
    ghost: "border-transparent text-gray-500 hover:text-brand-black hover:bg-black/5",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
    xl: "px-10 py-5 text-lg",
  };

  return (
    <button
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};