import fs from 'fs';

let privacy = fs.readFileSync('Privacy Policy.html', 'utf-8');
let cookie = fs.readFileSync('Cookie Policy.html', 'utf-8');

function cleanHtml(html) {
  // Remove style tags and their content
  let cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove the big Termly logo span at the top
  cleaned = cleaned.replace(/<span style="display: block;margin: 0 auto 3\.125rem[^>]*><\/span>/gi, '');
  
  // Remove all style attributes
  cleaned = cleaned.replace(/ style="[^"]*"/gi, '');
  
  // Remove data-custom-class attributes
  cleaned = cleaned.replace(/ data-custom-class="[^"]*"/gi, '');
  
  // Remove bdt tags but keep content
  cleaned = cleaned.replace(/<bdt[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/bdt>/gi, '');
  
  // Clean up excessive empty spans
  cleaned = cleaned.replace(/<span><\/span>/gi, '');
  cleaned = cleaned.replace(/<span>\s*<\/span>/gi, '');

  return cleaned;
}

privacy = cleanHtml(privacy);
cookie = cleanHtml(cookie);

// Create the combined Privacy page JSX
const jsx = `
import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-[#F0EFF8] py-20 px-6 sm:px-8">
      <div className="max-w-[720px] mx-auto prose prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-a:text-indigo-400">
        <div dangerouslySetInnerHTML={{ __html: \`${privacy.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />
        
        <hr className="my-16 border-white/10" />
        
        <div dangerouslySetInnerHTML={{ __html: \`${cookie.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/privacy/page.tsx', jsx);
console.log("Created /app/privacy/page.tsx");
