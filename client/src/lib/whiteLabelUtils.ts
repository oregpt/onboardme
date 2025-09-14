// White-label utilities for detecting and managing white-label mode via domain validation

export interface WhiteLabelConfig {
  isWhiteLabel: boolean;
  domain?: string;
  feature?: 'chat' | 'guides' | 'both';
  routeMode?: 'project_guides' | 'single_guide';
  projectId?: number;
  guideId?: number;
  theme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
}

// Cache for domain mapping check to avoid repeated API calls
let domainMappingCache: WhiteLabelConfig | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function checkDomainMapping(): Promise<WhiteLabelConfig> {
  if (typeof window === 'undefined') {
    return { isWhiteLabel: false };
  }

  // Check cache first
  const now = Date.now();
  if (domainMappingCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return domainMappingCache;
  }

  // First try to read from injected script tag
  try {
    const configScript = document.getElementById('white-label-config');
    if (configScript) {
      const injectedConfig = JSON.parse(configScript.textContent || '{}');
      if (injectedConfig && typeof injectedConfig === 'object') {
        console.log('✅ Using injected white-label config:', injectedConfig.isWhiteLabel ? 'WHITE-LABEL' : 'NORMAL');
        
        // Cache the result
        domainMappingCache = injectedConfig;
        cacheTimestamp = now;
        
        return injectedConfig;
      }
    }
  } catch (error) {
    console.warn('Failed to read injected white-label config:', error);
  }

  // Fallback: Use secure API call to validate domain against database
  try {
    const hostname = window.location.hostname.toLowerCase();
    console.log('🔍 Making API call to validate domain:', hostname);
    
    const response = await fetch('/api/domain-info', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      // Don't include credentials for this check - it's a public endpoint
      credentials: 'omit'
    });
    
    if (response.ok) {
      const domainInfo = await response.json();
      console.log('✅ API response for domain info:', domainInfo.isWhiteLabel ? 'WHITE-LABEL' : 'NORMAL');
      
      // Cache the result
      domainMappingCache = domainInfo;
      cacheTimestamp = now;
      
      return domainInfo;
    } else {
      console.warn('⚠️ Domain info API returned error status:', response.status);
      // Safe fallback - default to non-white-label mode on API errors
      const config = { isWhiteLabel: false };
      domainMappingCache = config;
      cacheTimestamp = now;
      return config;
    }
  } catch (error) {
    console.warn('❌ Error calling domain info API:', error);
    // Safe fallback - default to non-white-label mode on API errors
    const config = { isWhiteLabel: false };
    domainMappingCache = config;
    cacheTimestamp = now;
    return config;
  }
}

export async function isWhiteLabelMode(): Promise<boolean> {
  const config = await checkDomainMapping();
  return config.isWhiteLabel;
}

export function applyWhiteLabelTheme(theme: any) {
  if (typeof window === 'undefined' || !theme || typeof theme !== 'object') {
    return;
  }

  const root = document.documentElement;
  
  // Apply theme CSS variables
  Object.entries(theme).forEach(([key, value]) => {
    if (typeof value === 'string') {
      root.style.setProperty(`--${key}`, value);
    }
  });
}

// Clear the domain mapping cache (useful for testing or when domain changes)
export function clearDomainMappingCache() {
  domainMappingCache = null;
  cacheTimestamp = 0;
}

// Get API endpoint prefix based on white-label mode
export function getApiPrefix(isWhiteLabel: boolean): string {
  return isWhiteLabel ? '/public' : '/api';
}

// Legacy support for old parseWhiteLabelParams function - now returns empty config
// This ensures backward compatibility while using secure domain detection
export function parseWhiteLabelParams(): { mode: null } {
  console.warn('parseWhiteLabelParams is deprecated - use checkDomainMapping instead');
  return { mode: null };
}