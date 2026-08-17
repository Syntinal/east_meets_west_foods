import { RichText } from "@payloadcms/richtext-lexical/react";

export type FaqQuestion = { question?: string | null; answer?: unknown };
export type FaqDoc = {
  eyebrow?: string | null;
  heading?: string | null;
  questions?: FaqQuestion[] | null;
};

// Shared between the plain server-rendered /faq page and its live-preview
// counterpart. The original hand-coded FAQ had one hardcoded <Link
// href="/contact"> inline in the "Where are you located?" answer — that's
// now just part of that question's rich-text answer (the owner can add or
// keep links in any answer via the rich text editor's own link tool)
// rather than special-cased markup here.
export function FaqView({ faq }: { faq: FaqDoc }) {
  const questions = faq.questions ?? [];

  return (
    <main>
      <section className="section faq-section" aria-labelledby="faq-heading">
        <div className="container">
          <header className="section-head">
            <p className="eyebrow">{faq.eyebrow || "FAQ"}</p>
            <h1 id="faq-heading" className="section-title">
              {faq.heading}
            </h1>
          </header>
          <div className="text-panel text-panel--faq">
            <dl className="faq-list">
              {questions.map((q, i) => (
                <div className="faq-item" key={i}>
                  <dt className="faq-question">{q.question}</dt>
                  <dd className="faq-answer">{q.answer ? <RichText data={q.answer as never} /> : null}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
