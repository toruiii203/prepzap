import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight, ChevronLeft, BookOpen, Target, Clock, Calendar,
  Check, Sparkles, Brain, Wrench, Palette, Code, Microscope, Music
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const focusAreas = [
  { id: "sciences", name: "Sciences", icon: Microscope, category: "Academic" },
  { id: "ai-tools", name: "AI Tools", icon: Brain, category: "Technology" },
  { id: "engineering", name: "Engineering & CAD", icon: Wrench, category: "Technology" },
  { id: "creative", name: "Creative Arts", icon: Palette, category: "Creative" },
  { id: "programming", name: "Programming", icon: Code, category: "Technology" },
  { id: "exam-prep", name: "Exam Prep", icon: BookOpen, category: "Academic" },
  { id: "music", name: "Music Theory", icon: Music, category: "Creative" },
  { id: "other", name: "Something Else", icon: Target, category: "Other" },
];

const studyGoals = [
  { id: "casual", name: "Casual", description: "15 min/day", minutes: 15 },
  { id: "regular", name: "Regular", description: "30 min/day", minutes: 30 },
  { id: "serious", name: "Serious", description: "1 hour/day", minutes: 60 },
  { id: "intensive", name: "Intensive", description: "2+ hours/day", minutes: 120 },
];

const steps = [
  { id: 1, title: "Welcome" },
  { id: 2, title: "Focus Area" },
  { id: 3, title: "Study Goal" },
  { id: 4, title: "Schedule" },
  { id: 5, title: "All Set!" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState("");

  const progress = (currentStep / steps.length) * 100;

  const canContinue = () => {
    switch (currentStep) {
      case 1: return userName.trim().length > 0;
      case 2: return selectedFocus !== null;
      case 3: return selectedGoal !== null;
      case 4: return true;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <span className="text-sm text-muted-foreground">Step {currentStep} of {steps.length}</span>
        </div>
        <div className="container mx-auto px-4 pb-4">
          <Progress value={progress} className="h-1" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center">
          
            {currentStep === 1 && (
              <div>
                <div className="w-20 h-20 bg-primary rounded-none flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Welcome to PrepZap!</h1>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">Let's personalize your learning experience. First, what should we call you?</p>
                <div className="max-w-sm mx-auto">
                  <Input placeholder="Enter your name" value={userName} onChange={(e) => setUserName(e.target.value)} className="text-center text-lg h-12" />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2">What do you want to master?</h1>
                  <p className="text-muted-foreground">Pick your main focus area (e.g., Physics, AI Tools, or Creative Arts).</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {focusAreas.map((area) => (
                    <button key={area.id} onClick={() => setSelectedFocus(area.id)}
                      className={cn(
                        "p-4 rounded-none border-2 text-left transition-all",
                        selectedFocus === area.id ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:border-primary/50"
                      )}>
                      <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 rounded-none flex items-center justify-center", selectedFocus === area.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                          <area.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{area.name}</span>
                            {selectedFocus === area.id && <Check className="w-4 h-4 text-primary" />}
                          </div>
                          <Badge variant="secondary" className="text-xs mt-1">{area.category}</Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2">Set your daily study goal</h1>
                  <p className="text-muted-foreground">How much time can you dedicate each day?</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {studyGoals.map((goal) => (
                    <button key={goal.id} onClick={() => setSelectedGoal(goal.id)}
                      className={cn(
                        "p-6 rounded-none border-2 text-center transition-all",
                        selectedGoal === goal.id ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:border-primary/50"
                      )}>
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn("w-12 h-12 rounded-none flex items-center justify-center", selectedGoal === goal.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                          <Clock className="w-6 h-6" />
                        </div>
                        <span className="font-semibold text-lg">{goal.name}</span>
                        <span className="text-sm text-muted-foreground">{goal.description}</span>
                        {selectedGoal === goal.id && <Check className="w-5 h-5 text-primary mt-1" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <div className="w-20 h-20 bg-accent/10 rounded-none flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-accent-foreground" />
                </div>
                <h1 className="text-3xl font-bold mb-2">When's your target date?</h1>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">Let's build a smarter learning schedule tailored to your daily habits.</p>
                <div className="max-w-sm mx-auto space-y-4">
                  <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="text-center h-12" />
                  <p className="text-xs text-muted-foreground">Optional — skip if you don't have a deadline</p>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <div className="w-20 h-20 bg-primary/10 rounded-none flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">You're all set, {userName}!</h1>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">Building real mastery — one concept at a time.</p>
                <Button size="lg" className="px-8 h-12 gap-2" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          
        </div>
      </main>

      {currentStep < 5 && (
        <footer className="border-t py-4">
          <div className="container mx-auto px-4 flex justify-between">
            <Button variant="ghost" onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setCurrentStep(s => s + 1)} disabled={!canContinue()}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
