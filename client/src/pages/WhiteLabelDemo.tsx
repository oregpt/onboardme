import { WhiteLabelGuideViewer } from "@/components/WhiteLabelGuideViewer";
import { WhiteLabelLayout } from "@/components/WhiteLabelLayout";

// Example theme configurations for different brands
const themes = {
  default: {
    primary: "#3b82f6",
    secondary: "#f3f4f6", 
    background: "#ffffff",
    text: "#1f2937"
  },
  corporate: {
    primary: "#059669",
    secondary: "#f0fdf4",
    background: "#ffffff", 
    text: "#064e3b"
  },
  tech: {
    primary: "#7c3aed",
    secondary: "#faf5ff",
    background: "#ffffff",
    text: "#581c87" 
  },
  minimal: {
    primary: "#374151",
    secondary: "#f9fafb",
    background: "#ffffff",
    text: "#111827"
  }
};

export default function WhiteLabelDemo() {
  // Example usage - these would come from domain mapping in real implementation
  const exampleProps = {
    // Single guide mode example
    single: {
      guideId: 1,
      features: 'both' as const,
      theme: themes.corporate
    },
    
    // Project guides by slug example
    projectSlug: {
      projectId: 1,
      guideSlug: 'getting-started',
      features: 'guides' as const,
      theme: themes.tech
    },
    
    // Chat only example
    chatOnly: {
      guideId: 2,
      features: 'chat' as const,
      theme: themes.minimal
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">White Label Components Demo</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            These components can be embedded on custom domains with complete branding customization.
            They use public APIs that respect domain scoping and security constraints.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Single Guide Mode */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Single Guide Mode</h2>
            <p className="text-gray-600">
              Perfect for domains dedicated to a single guide. Includes both guide content and chat.
            </p>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden h-96">
              <div className="h-full overflow-auto">
                <WhiteLabelGuideViewer {...exampleProps.single} />
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Configuration:</strong><br />
              guideId: {exampleProps.single.guideId}<br />
              features: "{exampleProps.single.features}"<br />
              theme: Corporate Green
            </div>
          </div>

          {/* Project Guides Mode */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Project Guide by Slug</h2>
            <p className="text-gray-600">
              Access specific guides within a project by slug. Scoped to project boundaries.
            </p>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden h-96">
              <div className="h-full overflow-auto">
                <WhiteLabelGuideViewer {...exampleProps.projectSlug} />
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Configuration:</strong><br />
              projectId: {exampleProps.projectSlug.projectId}<br />
              guideSlug: "{exampleProps.projectSlug.guideSlug}"<br />
              features: "{exampleProps.projectSlug.features}"<br />
              theme: Tech Purple
            </div>
          </div>
        </div>

        {/* Theme Examples */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Theme Examples</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(themes).map(([name, theme]) => (
              <div key={name} className="bg-white rounded-lg shadow p-4 space-y-3">
                <h3 className="font-medium text-gray-900 capitalize">{name}</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.primary }}></div>
                    <span className="text-xs text-gray-600">Primary</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.secondary }}></div>
                    <span className="text-xs text-gray-600">Secondary</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: theme.background }}></div>
                    <span className="text-xs text-gray-600">Background</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.text }}></div>
                    <span className="text-xs text-gray-600">Text</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Code Example */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">Integration Example</h2>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-6 overflow-x-auto">
            <pre className="text-sm">
{`import { WhiteLabelGuideViewer } from "./components/WhiteLabelGuideViewer";

// Custom domain integration example
export function CustomDomainGuide() {
  const theme = {
    primary: "#your-brand-color",
    secondary: "#your-secondary-color", 
    background: "#ffffff",
    text: "#333333"
  };

  return (
    <WhiteLabelGuideViewer
      guideId={guideId}           // From domain mapping
      projectId={projectId}       // From domain mapping  
      guideSlug={slug}           // From URL path
      features="both"            // From domain mapping
      theme={theme}              // Your brand colors
    />
  );
}`}
            </pre>
          </div>
        </div>

        {/* Key Features */}
        <div className="bg-blue-50 rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-blue-900">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-blue-800">🎨 Complete Branding Control</h3>
              <p className="text-blue-700 text-sm">
                Customize colors, remove all platform branding, match your brand identity
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-blue-800">🔒 Domain-Scoped Security</h3>
              <p className="text-blue-700 text-sm">
                Only access guides and content allowed by domain mapping configuration
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-blue-800">💬 AI Chat Integration</h3>
              <p className="text-blue-700 text-sm">
                Built-in chat functionality with context-aware responses
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-blue-800">📱 Responsive Design</h3>
              <p className="text-blue-700 text-sm">
                Works perfectly on all devices and screen sizes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}