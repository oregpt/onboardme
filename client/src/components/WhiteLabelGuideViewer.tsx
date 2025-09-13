interface WhiteLabelGuideViewerProps {
  guideId?: number;
  guideSlug?: string;
  projectId?: number;
  features?: 'guides' | 'chat' | 'both';
  theme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
}

export function WhiteLabelGuideViewer({ 
  guideId, 
  guideSlug, 
  projectId, 
  features = 'both',
  theme 
}: WhiteLabelGuideViewerProps) {
  // ISOLATION TEST STEP 1: Minimal working component
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme?.background || '#ffffff' }}>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4" style={{ color: theme?.text || '#000000' }}>
          Working! 🎉
        </h1>
        <p className="text-lg" style={{ color: theme?.text || '#000000' }}>
          Project ID: {projectId}<br/>
          Guide ID: {guideId}<br/>
          Features: {features}
        </p>
      </div>
    </div>
  );
}