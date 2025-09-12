import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhiteLabelChat } from "./WhiteLabelChat";
import { CheckCircle, Circle, MessageCircle, Grid3X3, List } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Guide, FlowBox, Step } from "@shared/schema";

interface WhiteLabelGuideViewerProps {
  guideId?: number;
  guideSlug?: string;
  projectId?: number;
  features?: ('guides' | 'chat' | 'both');
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tile' | 'detailed'>('tile');
  const [selectedFlowBoxId, setSelectedFlowBoxId] = useState<number | null>(null);
  const [currentChatStep, setCurrentChatStep] = useState<Step | null>(null);
  const [currentChatFlowBox, setCurrentChatFlowBox] = useState<FlowBox | null>(null);

  // Determine the appropriate API endpoint based on props
  let guideEndpoint = '';
  if (guideId) {
    guideEndpoint = `/public/guide/${guideId}`;
  } else if (guideSlug && projectId) {
    guideEndpoint = `/public/guide/${projectId}/${guideSlug}`;
  } else if (guideSlug) {
    guideEndpoint = `/public/guide/slug/${guideSlug}`;
  }

  // Fetch guide using public API
  const { data: guide, isLoading: guideLoading } = useQuery<Guide>({
    queryKey: [guideEndpoint],
    enabled: !!guideEndpoint,
  });

  // Fetch flow boxes using public API
  const { data: flowBoxes, isLoading: flowBoxesLoading } = useQuery<FlowBox[]>({
    queryKey: [`/public/guides/${guide?.id}/flowboxes`],
    enabled: !!guide?.id,
  });

  // Fetch steps using public API
  const { data: allSteps } = useQuery<Step[]>({
    queryKey: [`/public/guides/${guide?.id}/steps`],
    enabled: !!guide?.id,
  });

  if (guideLoading || flowBoxesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: theme?.background }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600" style={{ color: theme?.text }}>Loading guide...</p>
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: theme?.background }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2" style={{ color: theme?.text }}>Guide Not Found</h1>
          <p className="text-gray-600" style={{ color: theme?.text }}>The requested guide could not be found or is not available.</p>
        </div>
      </div>
    );
  }

  const groupedSteps = (allSteps || []).reduce((acc, step) => {
    if (!acc[step.flowBoxId]) {
      acc[step.flowBoxId] = [];
    }
    acc[step.flowBoxId].push(step);
    return acc;
  }, {} as Record<number, Step[]>);

  // Sort flow boxes by position
  const sortedFlowBoxes = (flowBoxes || []).sort((a, b) => a.position - b.position);

  const handleFlowClick = (flowBoxId: number) => {
    setSelectedFlowBoxId(selectedFlowBoxId === flowBoxId ? null : flowBoxId);
  };

  const selectedFlowBox = sortedFlowBoxes.find(fb => fb.id === selectedFlowBoxId);
  const selectedSteps = selectedFlowBox ? groupedSteps[selectedFlowBox.id] || [] : [];

  return (
    <div className="min-h-screen bg-gray-50" style={{ backgroundColor: theme?.background }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8" style={{ backgroundColor: theme?.background }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900" style={{ color: theme?.text }}>
                {guide.title}
              </h1>
              {guide.description && (
                <p className="text-lg text-gray-600" style={{ color: theme?.text }}>
                  {guide.description}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-4">
                {guide.personas && (
                  <Badge variant="outline" className="text-sm">
                    {Array.isArray(guide.personas) ? guide.personas.join(', ') : guide.personas}
                  </Badge>
                )}
                <span className="text-sm text-gray-500" style={{ color: theme?.text }}>
                  {sortedFlowBoxes.length} sections
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'tile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('tile')}
                  className="px-3 py-1.5"
                  style={{ backgroundColor: viewMode === 'tile' ? theme?.primary : 'transparent' }}
                >
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Overview
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('detailed')}
                  className="px-3 py-1.5"
                  style={{ backgroundColor: viewMode === 'detailed' ? theme?.primary : 'transparent' }}
                >
                  <List className="w-4 h-4 mr-1" />
                  Detailed
                </Button>
              </div>

              {/* Chat Toggle */}
              {(features === 'chat' || features === 'both') && (
                <Button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  variant={isChatOpen ? 'default' : 'outline'}
                  className="px-4 py-2"
                  style={{ backgroundColor: isChatOpen ? theme?.primary : 'transparent' }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {isChatOpen ? 'Close Chat' : 'Get Help'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {viewMode === 'tile' ? (
          <WhiteLabelFlowTiles 
            flowBoxes={sortedFlowBoxes}
            groupedSteps={groupedSteps}
            onFlowClick={handleFlowClick}
            selectedFlowBoxId={selectedFlowBoxId}
            theme={theme}
          />
        ) : (
          <WhiteLabelDetailedView 
            flowBoxes={sortedFlowBoxes}
            groupedSteps={groupedSteps}
            theme={theme}
          />
        )}
      </div>

      {/* Chat Interface */}
      {isChatOpen && (features === 'chat' || features === 'both') && (
        <WhiteLabelChat
          guide={guide}
          flowBox={currentChatFlowBox}
          currentStep={currentChatStep}
          allSteps={allSteps || []}
          allFlowBoxes={sortedFlowBoxes}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
          theme={theme}
        />
      )}
    </div>
  );
}

// Flow Tiles Component
interface WhiteLabelFlowTilesProps {
  flowBoxes: FlowBox[];
  groupedSteps: Record<number, Step[]>;
  onFlowClick: (flowBoxId: number) => void;
  selectedFlowBoxId: number | null;
  theme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
}

function WhiteLabelFlowTiles({ 
  flowBoxes, 
  groupedSteps, 
  onFlowClick, 
  selectedFlowBoxId,
  theme 
}: WhiteLabelFlowTilesProps) {
  return (
    <div className="space-y-6">
      {/* Flow Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flowBoxes.map((flowBox, index) => {
          const boxSteps = groupedSteps[flowBox.id] || [];
          const isSelected = selectedFlowBoxId === flowBox.id;

          return (
            <Card 
              key={flowBox.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onFlowClick(flowBox.id)}
              data-testid={`flow-tile-${flowBox.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-800"
                       style={{ backgroundColor: theme?.secondary, color: theme?.text }}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg" style={{ color: theme?.text }}>
                      {flowBox.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {flowBox.description && (
                  <p className="text-sm text-gray-600" style={{ color: theme?.text }}>
                    {flowBox.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500" style={{ color: theme?.text }}>
                  <span>{boxSteps.length} steps</span>
                  <span>View Details</span>
                </div>

                {isSelected && boxSteps.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-sm" style={{ color: theme?.text }}>Steps:</h4>
                    {boxSteps.slice(0, 3).map((step) => (
                      <div key={step.id} className="flex items-center space-x-2 text-sm">
                        <Circle className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600 truncate" style={{ color: theme?.text }}>
                          {step.title}
                        </span>
                      </div>
                    ))}
                    {boxSteps.length > 3 && (
                      <p className="text-xs text-gray-500" style={{ color: theme?.text }}>
                        +{boxSteps.length - 3} more steps
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Detailed View Component
interface WhiteLabelDetailedViewProps {
  flowBoxes: FlowBox[];
  groupedSteps: Record<number, Step[]>;
  theme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
}

function WhiteLabelDetailedView({ flowBoxes, groupedSteps, theme }: WhiteLabelDetailedViewProps) {
  return (
    <div className="space-y-8">
      {flowBoxes.map((flowBox, index) => {
        const boxSteps = groupedSteps[flowBox.id] || [];

        return (
          <Card key={flowBox.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50" style={{ backgroundColor: theme?.secondary }}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold"
                     style={{ backgroundColor: theme?.primary }}>
                  {index + 1}
                </div>
                <div>
                  <CardTitle className="text-xl" style={{ color: theme?.text }}>
                    {flowBox.title}
                  </CardTitle>
                  {flowBox.description && (
                    <p className="text-gray-600 mt-1" style={{ color: theme?.text }}>
                      {flowBox.description}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {boxSteps.map((step, stepIndex) => (
                <div key={step.id} className="border-b border-gray-200 last:border-b-0">
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 mt-1"
                           style={{ backgroundColor: theme?.secondary }}>
                        {stepIndex + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2" style={{ color: theme?.text }}>
                          {step.title}
                        </h4>
                        {step.content && (
                          <div className="prose prose-sm max-w-none text-gray-700" style={{ color: theme?.text }}>
                            <ReactMarkdown>{step.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}