import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WhiteLabelLayout from '@/components/WhiteLabelLayout';
import WhiteLabelGuideViewer from '@/components/WhiteLabelGuideViewer';
import WhiteLabelChat from '@/components/WhiteLabelChat';
import '@/index.css';

// Create a query client for the white-label interface
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// White-label app component
function WhiteLabelApp() {
  const container = document.querySelector('[data-white-label-project], [data-white-label-guide], [data-white-label-slug]');
  
  if (!container) {
    return <div>Configuration error</div>;
  }

  // Parse configuration from data attributes
  const projectId = container.getAttribute('data-white-label-project');
  const guideId = container.getAttribute('data-white-label-guide');
  const slug = container.getAttribute('data-white-label-slug');
  const features = container.getAttribute('data-features') as 'chat' | 'guides' | 'both';
  const themeData = container.getAttribute('data-theme');
  
  let theme = {};
  try {
    theme = themeData ? JSON.parse(themeData) : {};
  } catch (error) {
    console.warn('Failed to parse theme data:', error);
  }

  // Apply theme to CSS custom properties
  React.useEffect(() => {
    if (theme && typeof theme === 'object') {
      const root = document.documentElement;
      Object.entries(theme).forEach(([key, value]) => {
        if (typeof value === 'string') {
          root.style.setProperty(`--${key}`, value);
        }
      });
    }
  }, [theme]);

  // Determine what to render based on configuration
  let content;
  
  if (projectId) {
    // Project guides mode - show guide list with optional chat
    content = (
      <div className="white-label-container">
        {features === 'guides' || features === 'both' ? (
          <WhiteLabelGuideViewer projectId={parseInt(projectId)} />
        ) : null}
        
        {features === 'chat' || features === 'both' ? (
          <div className="mt-6">
            <WhiteLabelChat />
          </div>
        ) : null}
      </div>
    );
  } else if (guideId) {
    // Single guide mode
    content = (
      <div className="white-label-container">
        {features === 'guides' || features === 'both' ? (
          <WhiteLabelGuideViewer guideId={parseInt(guideId)} />
        ) : null}
        
        {features === 'chat' || features === 'both' ? (
          <div className="mt-6">
            <WhiteLabelChat />
          </div>
        ) : null}
      </div>
    );
  } else if (slug) {
    // Guide by slug mode
    const projectIdFromAttr = container.getAttribute('data-project-id');
    content = (
      <div className="white-label-container">
        {features === 'guides' || features === 'both' ? (
          <WhiteLabelGuideViewer 
            guideSlug={slug} 
            projectId={projectIdFromAttr ? parseInt(projectIdFromAttr) : undefined}
          />
        ) : null}
        
        {features === 'chat' || features === 'both' ? (
          <div className="mt-6">
            <WhiteLabelChat />
          </div>
        ) : null}
      </div>
    );
  } else {
    content = <div>No content configuration found</div>;
  }

  return (
    <WhiteLabelLayout theme={theme}>
      {content}
    </WhiteLabelLayout>
  );
}

// Initialize the white-label app
function initWhiteLabelApp() {
  const root = document.getElementById('root');
  if (!root) {
    console.error('Root element not found');
    return;
  }

  const reactRoot = ReactDOM.createRoot(root);
  reactRoot.render(
    <QueryClientProvider client={queryClient}>
      <WhiteLabelApp />
    </QueryClientProvider>
  );
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWhiteLabelApp);
} else {
  initWhiteLabelApp();
}