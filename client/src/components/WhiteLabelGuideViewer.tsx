import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhiteLabelChat } from "@/components/WhiteLabelChat";
import { CheckCircle, Circle, MessageCircle, Grid3X3, List, BookOpen, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Guide, FlowBox, Step } from "@shared/schema";

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
  const effectiveFeatures: 'guides' | 'chat' | 'both' = features ?? 'both';
  const [isChatOpen, setIsChatOpen] = useState(effectiveFeatures === 'chat');
  const [viewMode, setViewMode] = useState<'tile' | 'detailed'>('tile');
  const [selectedFlowBoxId, setSelectedFlowBoxId] = useState<number | null>(null);
  const [currentChatStep, setCurrentChatStep] = useState<Step | null>(null);
  const [currentChatFlowBox, setCurrentChatFlowBox] = useState<FlowBox | null>(null);
  const [selectedGuideFromProject, setSelectedGuideFromProject] = useState<Guide | null>(null);

  // Determine the appropriate API endpoint based on props
  let guideEndpoint = '';
  let projectGuidesEndpoint = '';
  
  if (guideId) {
    guideEndpoint = `/public/guide/${guideId}`;
  } else if (guideSlug && projectId) {
    guideEndpoint = `/public/guide/${projectId}/${guideSlug}`;
  } else if (guideSlug) {
    guideEndpoint = `/public/guide/slug/${guideSlug}`;
  } else if (projectId) {
    // Handle projectId only case - fetch all guides from project
    projectGuidesEndpoint = `/public/guides/project/${projectId}`;
  }

  // Fetch project guides when only projectId is provided
  const { data: projectGuides, isLoading: projectGuidesLoading } = useQuery<Guide[]>({
    queryKey: [projectGuidesEndpoint],
    enabled: !!projectGuidesEndpoint,
  });

  // Auto-select guide logic for projectId-only mode
  let effectiveGuide: Guide | null = null;
  if (projectGuides && projectGuides.length === 1 && !selectedGuideFromProject) {
    // Auto-select if only one guide in project
    effectiveGuide = projectGuides[0];
  } else if (selectedGuideFromProject) {
    // Use manually selected guide
    effectiveGuide = selectedGuideFromProject;
  }

  // Fetch single guide using public API
  const { data: guide, isLoading: guideLoading } = useQuery<Guide>({
    queryKey: [guideEndpoint],
    enabled: !!guideEndpoint,
  });

  // Use either the fetched guide or the effective guide from project mode
  const currentGuide = guide || effectiveGuide;

  // Fetch flow boxes using public API
  const { data: flowBoxes, isLoading: flowBoxesLoading } = useQuery<FlowBox[]>({
    queryKey: [`/public/guides/${currentGuide?.id}/flowboxes`],
    enabled: !!currentGuide?.id,
  });

  // Fetch steps using public API
  const { data: allSteps } = useQuery<Step[]>({
    queryKey: [`/public/guides/${currentGuide?.id}/steps`],
    enabled: !!currentGuide?.id,
  });

  if (guideLoading || flowBoxesLoading || projectGuidesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: theme?.background }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600" style={{ color: theme?.text }}>Loading guide...</p>
        </div>
      </div>
    );
  }

  // Handle project guides selection mode
  if (projectGuides && projectGuides.length > 1 && !selectedGuideFromProject) {
    return (
      <WhiteLabelProjectGuidesList 
        projectGuides={projectGuides}
        onSelectGuide={setSelectedGuideFromProject}
        features={effectiveFeatures}
        theme={theme}
        projectId={projectId!}
      />
    );
  }

  if (!currentGuide) {
    const isProjectMode = !!projectGuidesEndpoint;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: theme?.background }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2" style={{ color: theme?.text }}>
            {isProjectMode ? 'No Public Guides Available' : 'Guide Not Found'}
          </h1>
          <p className="text-gray-600" style={{ color: theme?.text }}>
            {isProjectMode 
              ? 'This project does not have any public guides available.' 
              : 'The requested guide could not be found or is not available.'}
          </p>
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
      {/* Header - only show for guides/both */}
      {effectiveFeatures !== 'chat' && (
        <div className="bg-white border-b border-gray-200 px-6 py-8" style={{ backgroundColor: theme?.background }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900" style={{ color: theme?.text }}>
                {currentGuide.title}
              </h1>
              {currentGuide.description && (
                <p className="text-lg text-gray-600" style={{ color: theme?.text }}>
                  {currentGuide.description}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-4">
                {currentGuide.personas && (
                  <Badge variant="outline" className="text-sm">
                    {(() => {
                      const personas = currentGuide.personas;
                      return Array.isArray(personas) ? (personas as string[]).join(', ') : String(personas);
                    })()}
                  </Badge>
                )}
                <span className="text-sm text-gray-500" style={{ color: theme?.text }}>
                  {sortedFlowBoxes.length} sections
                </span>
                {projectGuides && projectGuides.length > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedGuideFromProject(null)}
                    data-testid="button-back-to-guides"
                  >
                    ← Back to Guides
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* View Mode Toggle - only show for guides/both */}
              {effectiveFeatures !== 'chat' && (
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
              )}

              {/* Chat Toggle - only show for 'both' mode */}
              {effectiveFeatures === 'both' && (
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
      )}

      {/* Main Content - only show for guides/both */}
      {effectiveFeatures !== 'chat' && (
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
      )}

      {/* Chat Interface */}
      {isChatOpen && (effectiveFeatures === 'chat' || effectiveFeatures === 'both') && (
        <WhiteLabelChat
          guide={currentGuide}
          flowBox={currentChatFlowBox}
          currentStep={currentChatStep}
          allSteps={allSteps || []}
          allFlowBoxes={sortedFlowBoxes}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
          closable={effectiveFeatures === 'both'}
          theme={theme}
        />
      )}
    </div>
  );
}

// Project Guides List Component - for when only projectId is provided and multiple guides exist
interface WhiteLabelProjectGuidesListProps {
  projectGuides: Guide[];
  onSelectGuide: (guide: Guide) => void;
  features: 'guides' | 'chat' | 'both';
  theme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  projectId: number;
}

function WhiteLabelProjectGuidesList({ 
  projectGuides, 
  onSelectGuide, 
  features,
  theme,
  projectId 
}: WhiteLabelProjectGuidesListProps) {
  const effectiveFeatures: 'guides' | 'chat' | 'both' = features ?? 'both';

  return (
    <div className="min-h-screen bg-gray-50" style={{ backgroundColor: theme?.background }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8" style={{ backgroundColor: theme?.background }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900" style={{ color: theme?.text }}>
              Available Guides
            </h1>
            <p className="text-lg text-gray-600" style={{ color: theme?.text }}>
              Select a guide to view or get help with
            </p>
            <div className="flex items-center justify-center space-x-4 mt-4">
              <Badge variant="outline" className="text-sm">
                {projectGuides.length} guides available
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Guides Grid */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectGuides.map((guide) => (
            <Card 
              key={guide.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
              onClick={() => onSelectGuide(guide)}
              data-testid={`guide-card-${guide.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
                       style={{ backgroundColor: theme?.secondary }}>
                    <BookOpen className="w-5 h-5 text-blue-800" style={{ color: theme?.text }} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight" style={{ color: theme?.text }}>
                      {guide.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {guide.description && (
                  <p className="text-sm text-gray-600 line-clamp-3" style={{ color: theme?.text }}>
                    {guide.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  {guide.personas && (
                    <Badge variant="outline" className="text-xs">
                      {(() => {
                        const personas = guide.personas;
                        return Array.isArray(personas) ? (personas as string[]).slice(0, 2).join(', ') : String(personas);
                      })()}
                    </Badge>
                  )}
                  <div className="flex items-center space-x-1 text-blue-600" style={{ color: theme?.primary }}>
                    <span>Open Guide</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Chat mode hint */}
        {effectiveFeatures === 'both' && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500" style={{ color: theme?.text }}>
              💡 After selecting a guide, you can use the chat feature to get personalized help
            </p>
          </div>
        )}
      </div>
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