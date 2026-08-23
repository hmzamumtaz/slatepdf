import type { Block } from '@/lib/blog';

/** Renders an article's blocks. Headings carry ids so the contents list can link to them. */
export function slugifyHeading(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function BlogBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2 key={i} id={slugifyHeading(block.text)} className="text-2xl font-bold text-foreground pt-6 scroll-mt-24">
                {block.text}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={i} id={slugifyHeading(block.text)} className="text-lg font-semibold text-foreground pt-3 scroll-mt-24">
                {block.text}
              </h3>
            );
          case 'p':
            return <p key={i} className="text-[17px] leading-[1.75] text-gray-700">{block.text}</p>;
          case 'steps':
            return (
              <ol key={i} className="space-y-3 list-none counter-reset">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-[17px] leading-[1.7] text-gray-700">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-semibold flex items-center justify-center mt-0.5">
                      {j + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            );
          case 'list':
            return (
              <ul key={i} className="space-y-2">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-[17px] leading-[1.7] text-gray-700">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 mt-3" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {block.head.map((h, j) => (
                        <th key={j} className="text-left font-semibold text-foreground px-4 py-3 border-b border-border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j} className="border-b border-border last:border-0">
                        {row.map((cell, k) => (
                          <td key={k} className="px-4 py-3 text-gray-700 align-top">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'callout':
            return (
              <aside key={i} className="rounded-xl border-l-4 border-black bg-gray-50 px-5 py-4">
                <p className="font-semibold text-foreground mb-1">{block.title}</p>
                <p className="text-[16px] leading-relaxed text-gray-700">{block.text}</p>
              </aside>
            );
        }
      })}
    </div>
  );
}
