import { ReactNode } from 'react';
import type { FunctionComponent } from '../../common/types';

interface LayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: LayoutProps): FunctionComponent => {
  return (
    <div className="min-h-screen bg-primary-50 text-foreground font-sans">
      {children}
    </div>
  );
};

export const AuthLayout = ({ children }: LayoutProps): FunctionComponent => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800">
      {children}
    </div>
  );
};

export default MainLayout;
