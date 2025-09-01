import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Zap, Shield, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Guide Builder</h1>
          </div>
          <Button data-testid="button-login" onClick={() => window.location.href = '/api/login'}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Create Interactive
            <span className="text-primary"> Developer Guides</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Build visual process-flow onboarding guides with drag-and-drop editing, 
            hierarchical step structure, and bulletproof progress tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              data-testid="button-get-started"
              onClick={() => window.location.href = '/api/login'}
              className="px-8"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" data-testid="button-view-demo">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Everything you need to onboard developers
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Zap className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Visual Flow Editor</CardTitle>
                <CardDescription>
                  Drag-and-drop interface for creating complex integration flows with hierarchical step structure.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Progress Tracking</CardTitle>
                <CardDescription>
                  Bulletproof session persistence with dual-level progress tracking for steps and flow boxes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Persona-Based Content</CardTitle>
                <CardDescription>
                  Customize content variations for different developer personas and experience levels.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Rich Content Editor</CardTitle>
                <CardDescription>
                  Markdown support with code snippets, documentation links, and file attachments.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Recovery Mechanisms</CardTitle>
                <CardDescription>
                  Built-in session recovery and auto-save functionality to prevent lost progress.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>
                  Comprehensive management interface for guides, user progress, and analytics.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Ready to streamline your developer onboarding?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join teams who have improved their integration success rates with interactive guides.
          </p>
          <Button 
            size="lg" 
            data-testid="button-start-building"
            onClick={() => window.location.href = '/api/login'}
            className="px-8"
          >
            Start Building Guides
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 Guide Builder. Built for developer success.</p>
        </div>
      </footer>
    </div>
  );
}
