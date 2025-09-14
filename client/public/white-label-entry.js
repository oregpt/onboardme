// White-label guide viewer entry point
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

  // Apply theme CSS variables
  if (theme && typeof theme === 'object') {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--${key}`, value);
      }
    });
  }

  // White-label guide viewer application
  class WhiteLabelGuideViewer {
    constructor(config) {
      this.projectId = config.projectId;
      this.guideId = config.guideId;
      this.slug = config.slug;
      this.features = config.features;
      this.theme = config.theme;
      this.container = config.container;
      this.currentGuide = null;
      this.currentGuideIndex = 0;
      this.guides = [];
      this.flowBoxes = [];
      this.steps = [];
      
      this.init();
    }

    // Safe HTML escaping function to prevent XSS
    escapeHtml(unsafe) {
      if (typeof unsafe !== 'string') {
        return '';
      }
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    async init() {
      this.showLoading();
      
      try {
        if (this.projectId) {
          // Project mode: load all guides for the project
          await this.loadProjectGuides();
        } else if (this.guideId) {
          // Single guide mode
          await this.loadSingleGuide();
        } else {
          this.showError('No project or guide ID specified');
          return;
        }
        
        this.render();
      } catch (error) {
        console.error('Failed to initialize guide viewer:', error);
        this.showError('Failed to load guide content');
      }
    }

    async loadProjectGuides() {
      const response = await fetch(`/public/guides/project/${this.projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project guides');
      }
      
      this.guides = await response.json();
      
      if (this.guides.length === 0) {
        this.showError('No guides found for this project');
        return;
      }
      
      // Load the first guide by default
      this.currentGuide = this.guides[0];
      await this.loadGuideContent(this.currentGuide.id);
    }

    async loadSingleGuide() {
      const response = await fetch(`/public/guide/${this.guideId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch guide');
      }
      
      this.currentGuide = await response.json();
      this.guides = [this.currentGuide];
      await this.loadGuideContent(this.currentGuide.id);
    }

    async loadGuideContent(guideId) {
      // Load flow boxes and steps
      const [flowBoxesRes, stepsRes] = await Promise.all([
        fetch(`/public/guides/${guideId}/flowboxes`),
        fetch(`/public/guides/${guideId}/steps`)
      ]);

      if (!flowBoxesRes.ok || !stepsRes.ok) {
        throw new Error('Failed to fetch guide content');
      }

      this.flowBoxes = await flowBoxesRes.json();
      this.steps = await stepsRes.json();
    }

    showLoading() {
      this.container.innerHTML = `
        <div style="
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          background-color: ${this.theme.background || '#ffffff'};
          color: ${this.theme.text || '#000000'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="text-align: center;">
            <div style="
              width: 40px; 
              height: 40px; 
              border: 3px solid ${this.theme.secondary || '#f3f4f6'}; 
              border-top: 3px solid ${this.theme.primary || '#3b82f6'}; 
              border-radius: 50%; 
              animation: spin 1s linear infinite;
              margin: 0 auto 1rem;
            "></div>
            <p>Loading guide...</p>
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
    }

    showError(message) {
      this.container.innerHTML = `
        <div style="
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          background-color: ${this.theme.background || '#ffffff'};
          color: ${this.theme.text || '#000000'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="text-align: center;">
            <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; color: #ef4444;">
              Error
            </h1>
            <p style="font-size: 1.125rem;">
              ${this.escapeHtml(message)}
            </p>
          </div>
        </div>
      `;
    }

    render() {
      const guideNavigation = this.guides.length > 1 ? this.renderGuideNavigation() : '';
      const guideContent = this.renderGuideContent();
      
      this.container.innerHTML = `
        <div style="
          min-height: 100vh; 
          background-color: ${this.theme.background || '#ffffff'};
          color: ${this.theme.text || '#000000'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          ${guideNavigation}
          ${guideContent}
        </div>
      `;
      
      this.attachEventListeners();
    }

    renderGuideNavigation() {
      const guides = this.guides.map((guide, index) => `
        <button 
          data-guide-index="${index}" 
          style="
            padding: 8px 16px;
            margin: 0 4px;
            background-color: ${index === this.currentGuideIndex ? (this.theme.primary || '#3b82f6') : 'transparent'};
            color: ${index === this.currentGuideIndex ? '#ffffff' : (this.theme.text || '#000000')};
            border: 1px solid ${this.theme.primary || '#3b82f6'};
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          "
        >
          ${this.escapeHtml(guide.title)}
        </button>
      `).join('');

      return `
        <div style="
          padding: 16px;
          background-color: ${this.theme.secondary || '#f9fafb'};
          border-bottom: 1px solid ${this.theme.secondary || '#e5e7eb'};
        ">
          <div style="max-width: 1200px; margin: 0 auto;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
              Select Guide:
            </h2>
            <div>
              ${guides}
            </div>
          </div>
        </div>
      `;
    }

    renderGuideContent() {
      if (!this.currentGuide) {
        return '<div style="padding: 20px; text-align: center;">No guide selected</div>';
      }

      const flowBoxesHtml = this.flowBoxes
        .sort((a, b) => a.position - b.position)
        .map(flowBox => this.renderFlowBox(flowBox))
        .join('');

      return `
        <div style="max-width: 1200px; margin: 0 auto; padding: 32px 16px;">
          <header style="margin-bottom: 32px; text-align: center;">
            <h1 style="
              font-size: 2.5rem; 
              font-weight: bold; 
              margin: 0 0 16px 0; 
              color: ${this.theme.text || '#000000'};
            ">
              ${this.escapeHtml(this.currentGuide.title)}
            </h1>
            ${this.currentGuide.description ? `
              <p style="
                font-size: 1.125rem; 
                line-height: 1.6; 
                color: ${this.theme.text || '#666666'};
                max-width: 800px;
                margin: 0 auto;
              ">
                ${this.escapeHtml(this.currentGuide.description)}
              </p>
            ` : ''}
          </header>
          
          <div style="space-y: 24px;">
            ${flowBoxesHtml}
          </div>
        </div>
      `;
    }

    renderFlowBox(flowBox) {
      const flowBoxSteps = this.steps
        .filter(step => step.flowBoxId === flowBox.id)
        .sort((a, b) => a.position - b.position);

      const stepsHtml = flowBoxSteps.map(step => this.renderStep(step)).join('');

      return `
        <div style="
          margin-bottom: 32px;
          border: 1px solid ${this.theme.secondary || '#e5e7eb'};
          border-radius: 8px;
          overflow: hidden;
        ">
          <div style="
            padding: 20px;
            background-color: ${this.theme.secondary || '#f9fafb'};
            border-bottom: 1px solid ${this.theme.secondary || '#e5e7eb'};
          ">
            <h3 style="
              font-size: 1.5rem;
              font-weight: 600;
              margin: 0;
              color: ${this.theme.text || '#000000'};
            ">
              ${this.escapeHtml(flowBox.title)}
            </h3>
            ${flowBox.description ? `
              <p style="
                margin: 8px 0 0 0;
                color: ${this.theme.text || '#666666'};
                line-height: 1.6;
              ">
                ${this.escapeHtml(flowBox.description)}
              </p>
            ` : ''}
          </div>
          
          <div style="padding: 0;">
            ${stepsHtml}
          </div>
        </div>
      `;
    }

    renderStep(step) {
      return `
        <div style="
          padding: 20px;
          border-bottom: 1px solid ${this.theme.secondary || '#e5e7eb'};
        ">
          <h4 style="
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 12px 0;
            color: ${this.theme.text || '#000000'};
          ">
            ${this.escapeHtml(step.title)}
          </h4>
          
          ${step.content ? `
            <div style="
              line-height: 1.6;
              color: ${this.theme.text || '#374151'};
            ">
              ${this.formatContent(step.content)}
            </div>
          ` : ''}
          
          ${step.codeSnippet ? `
            <div style="
              margin-top: 16px;
              padding: 16px;
              background-color: #f8f9fa;
              border-radius: 6px;
              font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
              font-size: 14px;
              overflow-x: auto;
              border-left: 4px solid ${this.theme.primary || '#3b82f6'};
            ">
              <pre style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(step.codeSnippet)}</pre>
            </div>
          ` : ''}
        </div>
      `;
    }

    formatContent(content) {
      if (!content || typeof content !== 'string') {
        return '';
      }
      
      // CRITICAL: Escape HTML entities first to prevent XSS
      const safeContent = this.escapeHtml(content);
      
      // Then apply safe markdown-like formatting to escaped content
      return safeContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background-color: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-size: 0.9em;">$1</code>')
        .replace(/\n/g, '<br>');
    }

    attachEventListeners() {
      // Guide navigation
      const guideButtons = this.container.querySelectorAll('[data-guide-index]');
      guideButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const index = parseInt(e.target.getAttribute('data-guide-index'));
          this.switchToGuide(index);
        });
      });
    }

    async switchToGuide(index) {
      if (index < 0 || index >= this.guides.length) return;
      
      this.currentGuideIndex = index;
      this.currentGuide = this.guides[index];
      
      this.showLoading();
      
      try {
        await this.loadGuideContent(this.currentGuide.id);
        this.render();
      } catch (error) {
        console.error('Failed to switch guide:', error);
        this.showError('Failed to load guide content');
      }
    }
  }

  // Initialize the white-label guide viewer
  new WhiteLabelGuideViewer({
    projectId,
    guideId,
    slug,
    features,
    theme,
    container
  });
})();