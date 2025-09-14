// Simple JavaScript entry point for white-label mode (no transformation needed)
(function() {
  // Find the configuration container
  const container = document.querySelector('[data-white-label-project], [data-white-label-guide], [data-white-label-slug]');
  
  if (!container) {
    document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Configuration error: No white-label data found</div>';
    return;
  }

  // Parse configuration
  const projectId = container.getAttribute('data-white-label-project');
  const guideId = container.getAttribute('data-white-label-guide');
  const slug = container.getAttribute('data-white-label-slug');
  const features = container.getAttribute('data-features') || 'both';
  const themeData = container.getAttribute('data-theme');
  
  let theme = {};
  try {
    theme = themeData ? JSON.parse(themeData) : {};
  } catch (error) {
    console.warn('Failed to parse theme data:', error);
  }

  // Apply theme
  if (theme && typeof theme === 'object') {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--${key}`, value);
      }
    });
  }

  // Simple working display
  const content = `
    <div style="
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      background-color: ${theme.background || '#ffffff'};
      color: ${theme.text || '#000000'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="text-align: center;">
        <h1 style="font-size: 3rem; font-weight: bold; margin-bottom: 1rem; color: ${theme.text || '#000000'};">
          Working! 🎉
        </h1>
        <p style="font-size: 1.125rem; color: ${theme.text || '#000000'};">
          Project ID: ${projectId}<br/>
          Guide ID: ${guideId}<br/>
          Features: ${features}
        </p>
      </div>
    </div>
  `;

  // Replace container content
  container.innerHTML = content;
})();