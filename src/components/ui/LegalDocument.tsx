import type { LegalSection } from "@/lib/legal";

/**
 * Renders the structured legal document (Terms & Conditions) with Ragebait
 * styling. Shared by the public /terms page and the in-registration modal so
 * the two never diverge.
 */
export default function LegalDocument({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          <h2 className="font-display text-lg font-bold text-white">
            <span className="text-aura-purple">{section.number}.</span> {section.title}
          </h2>
          <div className="mt-3 space-y-3">
            {section.blocks.map((block, i) =>
              block.type === "p" ? (
                <p key={i} className="text-sm leading-relaxed text-white/70">
                  {block.text}
                </p>
              ) : (
                <ul key={i} className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-white/70 marker:text-aura-purple/60">
                  {block.items?.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
