import React from 'react';

interface KiwimuPanelProps {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  header?: React.ReactNode;
}

export const KiwimuPanel: React.FC<KiwimuPanelProps> = ({
  children,
  className = '',
  padded = true,
  header,
}) => {
  return (
    <section
      className={`overflow-hidden rounded-2xl border-2 border-brand-black bg-white shadow-[4px_4px_0px_black] ${className}`.trim()}
    >
      {header}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
};
