import { ReactNode } from "react";

interface WhiteLabelLayoutProps {
  children: ReactNode;
  title?: string;
  theme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  showHeader?: boolean;
}

export function WhiteLabelLayout({ 
  children, 
  title = "Guide", 
  theme,
  showHeader = true 
}: WhiteLabelLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50" style={{ backgroundColor: theme?.background }}>
      {showHeader && (
        <header className="bg-white border-b border-gray-200 px-6 py-4" style={{ backgroundColor: theme?.background }}>
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900" style={{ color: theme?.text }}>
              {title}
            </h1>
          </div>
        </header>
      )}
      
      <main className="w-full">
        {children}
      </main>
      
      {/* Minimal footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 mt-auto" style={{ backgroundColor: theme?.background }}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-500" style={{ color: theme?.text }}>
            Need help? Use the chat feature for assistance.
          </p>
        </div>
      </footer>
    </div>
  );
}