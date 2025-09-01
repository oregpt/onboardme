import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SimpleLanding() {
  const handleATXPGuides = () => {
    window.location.href = "/api/login?flow=atxp";
  };

  const handleOtherGuides = () => {
    window.location.href = "/api/login?flow=other";
  };

  const handleCreateGuide = () => {
    window.location.href = "/api/login?flow=create";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-8 bg-white dark:bg-gray-800 shadow-2xl border-0">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            OnboardMe
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose your onboarding experience
          </p>
        </div>

        {/* Three Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleATXPGuides}
            className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-atxp-guides"
          >
            Access ATXP Guides
          </Button>

          <Button
            onClick={handleOtherGuides}
            className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-other-guides"
          >
            Access Other Guides
          </Button>

          <Button
            onClick={handleCreateGuide}
            className="w-full h-14 text-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-create-guide"
          >
            Create Your Own Guide
          </Button>
        </div>
      </Card>
    </div>
  );
}