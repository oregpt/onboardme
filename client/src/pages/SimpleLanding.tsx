import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SimpleLanding() {
  const handleCantyAIGuides = () => {
    window.location.href = "/api/login?flow=cantyai";
  };

  const handleOtherGuides = () => {
    window.location.href = "/api/login?flow=other";
  };

  const handleATXPGuides = () => {
    window.location.href = "/api/login?flow=atxp";
  };

  const handleCreateGuide = () => {
    window.location.href = "/api/login?flow=create";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-medium text-gray-700 dark:text-gray-200 tracking-wide">
            OnboardMe
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-light">
            Choose your onboarding experience
          </p>
        </div>

        {/* Four Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleCantyAIGuides}
            variant="outline"
            className="w-full h-14 text-lg font-medium bg-blue-50/50 hover:bg-blue-100/70 border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-200"
            data-testid="button-cantyai-guides"
          >
            Access CantyAI Guides
          </Button>

          <Button
            onClick={handleATXPGuides}
            variant="outline"
            className="w-full h-14 text-lg font-medium bg-orange-50/50 hover:bg-orange-100/70 border-orange-300 text-orange-700 hover:text-orange-800 transition-all duration-200"
            data-testid="button-atxp-guides"
          >
            Access ATXP Guides
          </Button>

          <Button
            onClick={handleOtherGuides}
            variant="outline"
            className="w-full h-14 text-lg font-medium bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-300 text-emerald-700 hover:text-emerald-800 transition-all duration-200"
            data-testid="button-other-guides"
          >
            Access Other Guides
          </Button>

          <Button
            onClick={handleCreateGuide}
            variant="outline"
            className="w-full h-14 text-lg font-medium bg-purple-50/50 hover:bg-purple-100/70 border-purple-300 text-purple-700 hover:text-purple-800 transition-all duration-200"
            data-testid="button-create-guide"
          >
            Create Your Own Guide
          </Button>
        </div>
      </Card>
    </div>
  );
}