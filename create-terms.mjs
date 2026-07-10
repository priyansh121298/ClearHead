import fs from 'fs';

let md = fs.readFileSync('clearhead-terms-and-conditions.md', 'utf-8');

// Convert Markdown to HTML
let html = md
  .replace(/^# (.*$)/gim, '<h1>$1</h1>')
  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.*?)\*/g, '<em>$1</em>')
  .replace(/^\- (.*$)/gim, '<li>$1</li>')
  .replace(/<\/li>\n<li>/g, '</li><li>');

// Wrap lists
html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

// Convert paragraphs
html = html
  .split('\n\n')
  .map(p => p.trim())
  .filter(p => p.length > 0 && p !== '---')
  .map(p => {
    if (p.startsWith('<h') || p.startsWith('<ul')) return p;
    return `<p>${p}</p>`;
  })
  .join('\n');

const jsx = `
import React from 'react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-[#F0EFF8] py-20 px-6 sm:px-8">
      <div className="max-w-[720px] mx-auto prose prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-a:text-indigo-400">
        <div dangerouslySetInnerHTML={{ __html: \`${html.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/terms/page.tsx', jsx);
console.log("Created /app/terms/page.tsx");
