import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Zap, Shield, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-white/20 dark:border-slate-700/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">onboardMe</h1>
          </div>
          <Button 
            data-testid="button-login" 
            onClick={() => window.location.href = '/api/login'}
            className="bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
            variant="ghost"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-pink-500/10 dark:from-blue-500/20 dark:via-purple-500/10 dark:to-pink-500/20"></div>
        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent leading-tight">
            Create Interactive
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Developer Guides</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Build visual process-flow onboarding guides with drag-and-drop editing, 
            hierarchical step structure, and bulletproof progress tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              data-testid="button-get-started"
              onClick={() => window.location.href = '/api/login'}
              className="px-12 py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-xl hover:shadow-2xl backdrop-blur-sm transition-all duration-500 transform hover:scale-105 text-lg font-semibold"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              data-testid="button-view-demo"
              className="px-12 py-6 bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105 text-lg font-semibold"
            >
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-slate-800/30"></div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Everything you need to onboard developers
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="backdrop-blur-md bg-white/60 dark:bg-slate-800/60 border border-white/20 dark:border-slate-700/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:bg-white/80 dark:hover:bg-slate-800/80 group">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-slate-800 dark:text-white">Visual Flow Editor</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Drag-and-drop interface for creating complex integration flows with hierarchical step structure.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="backdrop-blur-md bg-white/60 dark:bg-slate-800/60 border border-white/20 dark:border-slate-700/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:bg-white/80 dark:hover:bg-slate-800/80 group">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-slate-800 dark:text-white">Progress Tracking</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Bulletproof session persistence with dual-level progress tracking for steps and flow boxes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="backdrop-blur-md bg-white/60 dark:bg-slate-800/60 border border-white/20 dark:border-slate-700/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:bg-white/80 dark:hover:bg-slate-800/80 group">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-slate-800 dark:text-white">Persona-Based Content</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Customize content variations for different developer personas and experience levels.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="backdrop-blur-md bg-white/60 dark:bg-slate-800/60 border border-white/20 dark:border-slate-700/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:bg-white/80 dark:hover:bg-slate-800/80 group">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-slate-800 dark:text-white">Rich Content Editor</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Markdown support with code snippets, documentation links, and file attachments.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="backdrop-blur-md bg-white/60 dark:bg-slate-800/60 border border-white/20 dark:border-slate-700/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:bg-white/80 dark:hover:bg-slate-800/80 group">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-slate-800 dark:text-white">Recovery Mechanisms</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Built-in session recovery and auto-save functionality to prevent lost progress.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="backdrop-blur-md bg-white/60 dark:bg-slate-800/60 border border-white/20 dark:border-slate-700/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:bg-white/80 dark:hover:bg-slate-800/80 group">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-slate-800 dark:text-white">Admin Dashboard</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Comprehensive management interface for guides, user progress, and analytics.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/10 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/20 dark:to-pink-500/10"></div>
        <div className="container mx-auto text-center max-w-2xl relative z-10">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Ready to streamline your developer onboarding?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-12 leading-relaxed">
            Join teams who have improved their integration success rates with interactive guides.
          </p>
          <Button 
            size="lg" 
            data-testid="button-start-building"
            onClick={() => window.location.href = '/api/login'}
            className="px-12 py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-xl hover:shadow-2xl backdrop-blur-sm transition-all duration-500 transform hover:scale-105 text-lg font-semibold"
          >
            Start Building Guides
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-t border-white/20 dark:border-slate-700/20 py-12 px-4">
        <div className="container mx-auto text-center text-slate-600 dark:text-slate-400">
          <p>&copy; 2024 onboardMe. Built for developer success.</p>
        </div>
      </footer>
    </div>
  );
}
