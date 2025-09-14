import { createContext, useContext, useEffect, useState } from "react";
import { checkDomainMapping, applyWhiteLabelTheme, type WhiteLabelConfig } from "@/lib/whiteLabelUtils";

interface WhiteLabelContextType {
  config: WhiteLabelConfig;
  isWhiteLabel: boolean;
  isLoading: boolean;
}

const WhiteLabelContext = createContext<WhiteLabelContextType>({
  config: { isWhiteLabel: false },
  isWhiteLabel: false,
  isLoading: true,
});

export const useWhiteLabel = () => useContext(WhiteLabelContext);

interface WhiteLabelProviderProps {
  children: React.ReactNode;
}

export function WhiteLabelProvider({ children }: WhiteLabelProviderProps) {
  const [config, setConfig] = useState<WhiteLabelConfig>({ isWhiteLabel: false });
  const [isWhiteLabel, setIsWhiteLabel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeWhiteLabel = async () => {
      try {
        console.log('🔍 Initializing white-label context...');
        
        const whiteLabelConfig = await checkDomainMapping();
        
        setConfig(whiteLabelConfig);
        setIsWhiteLabel(whiteLabelConfig.isWhiteLabel);
        
        // Apply theme if in white-label mode
        if (whiteLabelConfig.isWhiteLabel && whiteLabelConfig.theme) {
          console.log('🎨 Applying white-label theme');
          applyWhiteLabelTheme(whiteLabelConfig.theme);
        }
        
        console.log('✅ White-label context initialized:', {
          isWhiteLabel: whiteLabelConfig.isWhiteLabel,
          domain: whiteLabelConfig.domain,
          feature: whiteLabelConfig.feature,
          routeMode: whiteLabelConfig.routeMode
        });
        
      } catch (error) {
        console.error('❌ Error initializing white-label context:', error);
        // Default to non-white-label mode on error
        setConfig({ isWhiteLabel: false });
        setIsWhiteLabel(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWhiteLabel();
  }, []);

  return (
    <WhiteLabelContext.Provider value={{ config, isWhiteLabel, isLoading }}>
      {children}
    </WhiteLabelContext.Provider>
  );
}