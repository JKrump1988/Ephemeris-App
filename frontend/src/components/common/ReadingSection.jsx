import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";


export function ReadingSection({ section, index }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative"
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
    >
      <Card className="overflow-hidden border border-white/10 bg-white/5 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl" data-testid={`reading-section-${index}`}>
        <CardContent className="space-y-4 p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400" data-testid={`reading-section-${index}-label`}>Layer {String(index + 1).padStart(2, "0")}</p>
            {section.highlight ? (
              <p className="text-xs uppercase tracking-[0.24em] text-primary" data-testid={`reading-section-${index}-highlight`}>{section.highlight}</p>
            ) : null}
          </div>

          <h2 className="font-display text-3xl text-white md:text-4xl" data-testid={`reading-section-${index}-title`}>{section.title}</h2>
          <p className="max-w-3xl text-sm leading-8 text-slate-200 md:text-base" data-testid={`reading-section-${index}-content`}>{section.content}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}