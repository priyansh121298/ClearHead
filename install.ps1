$components = @(
  "spotlight",
  "shimmer-button",
  "3d-card",
  "vortex",
  "glowing-stars",
  "floating-dock"
)

foreach ($comp in $components) {
  Write-Host "Installing $comp..."
  npx shadcn@latest add "https://ui.aceternity.com/registry/$comp.json" -y
}
