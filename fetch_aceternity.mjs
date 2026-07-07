import fs from 'fs';
import path from 'path';

const components = [
  'aurora-background',
  'spotlight',
  'shimmer-button',
  '3d-card-effect',
  'vortex',
  'glowing-stars',
  'floating-dock'
];

async function main() {
  if (!fs.existsSync('src/components/ui')) {
    fs.mkdirSync('src/components/ui', { recursive: true });
  }

  const tailwindConfigs = [];

  for (const name of components) {
    console.log(`Fetching ${name}...`);
    try {
      const res = await fetch(`https://ui.aceternity.com/registry/${name}.json`);
      if (!res.ok) {
        console.error(`Failed to fetch ${name}: ${res.status}`);
        continue;
      }
      const data = await res.json();
      
      // Save files
      if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
          const outPath = path.join('src/components/ui', file.name);
          fs.writeFileSync(outPath, file.content);
          console.log(`  -> Saved ${outPath}`);
        }
      }
      
      // Collect tailwind configs
      if (data.tailwind) {
        tailwindConfigs.push({ name, tailwind: data.tailwind });
      }
      
      // Print dependencies
      if (data.dependencies) {
        console.log(`  -> Dependencies: ${data.dependencies.join(', ')}`);
      }
    } catch (err) {
      console.error(`Error processing ${name}:`, err.message);
    }
  }
  
  fs.writeFileSync('aceternity_tailwind.json', JSON.stringify(tailwindConfigs, null, 2));
  console.log('Saved tailwind configs to aceternity_tailwind.json');
}

main();
