"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { Flame, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Database } from "@/types/database";

const fitnessGoals = [
  { id: "weight_loss", label: "Weight Loss" },
  { id: "muscle", label: "Muscle Building" },
  { id: "endurance", label: "Endurance" },
  { id: "flexibility", label: "Flexibility" },
  { id: "wellness", label: "General Wellness" },
  { id: "longevity", label: "Longevity" },
];

const equipmentOptions = [
  { id: "gym", label: "Full Gym" },
  { id: "bodyweight", label: "Bodyweight Only" },
  { id: "home_gym", label: "Home Gym" },
  { id: "outdoor", label: "Outdoor / Running" },
];

const dietaryPreferences = [
  { value: "none", label: "No preference" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic info
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  // Step 2: Fitness level & goals
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Step 3: Equipment & commitment
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [weeklyCommitment, setWeeklyCommitment] = useState("");

  // Step 4: Dietary preference & sleep
  const [dietaryPreference, setDietaryPreference] = useState("none");
  const [sleepTarget, setSleepTarget] = useState("8");

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  };

  const toggleEquipment = (eqId: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eqId)
        ? prev.filter((e) => e !== eqId)
        : [...prev, eqId]
    );
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to complete onboarding.");
      setLoading(false);
      return;
    }

    // Save user profile
    const { error: profileError } = await (supabase as any).from("user_profiles").upsert({
      user_id: user.id,
      age: age ? parseInt(age) : null,
      gender: gender || null,
      fitness_level: (fitnessLevel as "beginner" | "intermediate" | "advanced") || null,
      weight_kg: weight ? parseFloat(weight) : null,
      height_cm: height ? parseFloat(height) : null,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Save selected goals
    if (selectedGoals.length > 0) {
      const goalsToInsert = selectedGoals.map((goal, idx) => ({
        user_id: user.id,
        goal_type: goal as any,
        priority: idx + 1,
        target_value: null,
      }));

      // Delete existing goals first
      await (supabase as any).from("user_goals").delete().eq("user_id", user.id);
      const { error: goalsError } = await (supabase as any)
        .from("user_goals")
        .insert(goalsToInsert);

      if (goalsError) {
        console.error("Goals save error:", goalsError);
      }
    }

    // Update user display name if needed
    await (supabase as any).from("users").update({}).eq("id", user.id);

    router.push("/dashboard");
    router.refresh();
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return age !== "" && gender !== "" && height !== "" && weight !== "";
      case 1:
        return fitnessLevel !== "" && selectedGoals.length > 0;
      case 2:
        return selectedEquipment.length > 0 && weeklyCommitment !== "";
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
            <Flame className="h-5 w-5 text-zinc-950" />
          </div>
          <span className="text-xl font-bold text-white">Forge Fit</span>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Step {step + 1} of {totalSteps}
            </span>
            <Badge variant="outline" className="text-xs">
              {progress.toFixed(0)}%
            </Badge>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <Card className="border-zinc-800 bg-zinc-900">
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle className="text-white">About You</CardTitle>
                <CardDescription>
                  Help us personalize your fitness journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min={13}
                    max={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      placeholder="175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      min={50}
                      max={300}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      placeholder="70"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      min={20}
                      max={500}
                      step={0.1}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Fitness Level & Goals */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-white">Fitness Profile</CardTitle>
                <CardDescription>
                  What&apos;s your current level and what are your goals?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Fitness Level</Label>
                  <Select value={fitnessLevel} onValueChange={setFitnessLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Goals</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {fitnessGoals.map((goal) => (
                      <label
                        key={goal.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          selectedGoals.includes(goal.id)
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                            : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        }`}
                      >
                        <Checkbox
                          checked={selectedGoals.includes(goal.id)}
                          onCheckedChange={() => toggleGoal(goal.id)}
                        />
                        {goal.label}
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Equipment & Commitment */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-white">Your Setup</CardTitle>
                <CardDescription>
                  What equipment do you have access to and how often?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Available Equipment</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {equipmentOptions.map((eq) => (
                      <label
                        key={eq.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          selectedEquipment.includes(eq.id)
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                            : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        }`}
                      >
                        <Checkbox
                          checked={selectedEquipment.includes(eq.id)}
                          onCheckedChange={() => toggleEquipment(eq.id)}
                        />
                        {eq.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Weekly Commitment</Label>
                  <Select value={weeklyCommitment} onValueChange={setWeeklyCommitment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Days per week" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          {d} day{d > 1 ? "s" : ""} per week
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 4: Diet & Sleep */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="text-white">Lifestyle Preferences</CardTitle>
                <CardDescription>
                  Help us tailor your nutrition and recovery tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Dietary Preference</Label>
                  <Select value={dietaryPreference} onValueChange={setDietaryPreference}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dietaryPreferences.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sleepTarget">Sleep Target (hours)</Label>
                  <Select value={sleepTarget} onValueChange={setSleepTarget}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7, 8, 9, 10].map((h) => (
                        <SelectItem key={h} value={h.toString()}>
                          {h} hours
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Check className="h-4 w-4 text-emerald-500" />
                    You can always change these later in Settings
                  </div>
                </div>
              </CardContent>
            </>
          )}

          <CardFooter className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {step < totalSteps - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving..." : "Complete Setup"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
