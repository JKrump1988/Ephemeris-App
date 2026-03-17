import { useEffect, useState } from "react";
import { BookOpenText, LockKeyhole, PlayCircle, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";


export default function AcademyPage() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/academy/catalog")
      .then((response) => setCatalog(response.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-24 text-sm uppercase tracking-[0.24em] text-slate-400" data-testid="academy-loading-state">Loading Ephemeral Academy…</div>;
  }

  if (!catalog) {
    return null;
  }

  return (
    <div className="space-y-8" data-testid="academy-page">
      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]" data-testid="academy-hero-section">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="academy-hero-card">
          <CardContent className="space-y-5 p-7 md:p-9">
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid="academy-hero-eyebrow">Future-ready learning system</p>
            <h1 className="font-display text-5xl leading-[0.95] text-white md:text-6xl" data-testid="academy-hero-title">{catalog.title}</h1>
            <p className="max-w-3xl text-base leading-8 text-slate-300" data-testid="academy-hero-description">{catalog.description}</p>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" data-testid="academy-hero-notes-card">
          <CardContent className="space-y-5 p-7">
            <div className="flex items-center gap-3">
              <BookOpenText className="h-5 w-5 text-primary" />
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Prepared for later expansion</p>
            </div>
            <p className="text-sm leading-7 text-slate-300">The Academy structure already supports course cards, lesson modules, mixed video/text lessons, and locked premium content without needing to rebuild the core product shell later.</p>
            <Button className="border border-white/10 bg-white/5 px-5 py-3 text-xs uppercase tracking-[0.24em] text-white hover:bg-white/10" data-testid="academy-dashboard-return-button" onClick={() => window.history.back()} variant="ghost">
              Return to previous page
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2" data-testid="academy-course-grid">
        {catalog.courses.map((course) => (
          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl" key={course.id} data-testid={`academy-course-${course.id}`}>
            <CardContent className="space-y-6 p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{course.cover_theme}</p>
                  <h2 className="mt-2 font-display text-4xl text-white">{course.title}</h2>
                </div>
                <div className={`border px-3 py-2 text-[11px] uppercase tracking-[0.24em] ${course.locked ? "border-white/10 bg-white/5 text-slate-300" : "border-primary/30 bg-primary/10 text-primary"}`} data-testid={`academy-course-${course.id}-status`}>
                  {course.locked ? "Premium placeholder" : "Open sample path"}
                </div>
              </div>

              <p className="text-sm leading-7 text-slate-300" data-testid={`academy-course-${course.id}-description`}>{course.description}</p>

              <div className="space-y-4" data-testid={`academy-course-${course.id}-modules`}>
                {course.modules.map((module) => (
                  <div className="border border-white/10 bg-black/25 p-5" key={module.id} data-testid={`academy-module-${module.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Module</p>
                        <h3 className="mt-2 font-display text-2xl text-white">{module.title}</h3>
                      </div>
                      {module.locked ? <LockKeyhole className="h-4 w-4 text-slate-400" /> : null}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{module.summary}</p>

                    <div className="mt-4 grid gap-3" data-testid={`academy-module-${module.id}-lessons`}>
                      {module.lessons.map((lesson) => (
                        <div className="flex items-center justify-between gap-3 border border-white/8 bg-white/5 px-4 py-3" key={lesson.id} data-testid={`academy-lesson-${lesson.id}`}>
                          <div className="flex items-center gap-3">
                            {lesson.lesson_type === "video" ? <PlayCircle className="h-4 w-4 text-primary" /> : <ScrollText className="h-4 w-4 text-primary" />}
                            <div>
                              <p className="text-sm text-white">{lesson.title}</p>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{lesson.lesson_type} · {lesson.duration}</p>
                            </div>
                          </div>
                          <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{lesson.locked ? "Locked" : "Preview"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}