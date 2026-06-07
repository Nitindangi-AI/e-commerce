/**
 * Fix Dashboard Theme Script
 * Replaces all dark-mode color patterns with the unified Blossom Pink light theme equivalents.
 * Both AdminDashboard.jsx and VendorDashboard.jsx get the same treatment.
 */
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'src/pages/Admin/AdminDashboard.jsx'),
  path.join(__dirname, 'src/pages/Vendor/VendorDashboard.jsx'),
];

// Replacement map: dark-mode class → light pink theme equivalent
// Order matters: longer/more-specific patterns first
const replacements = [
  // ── Modals ──
  ['bg-[#111111] border border-white/10', 'bg-white border border-[#ffd5dd]'],
  ['bg-[#111] border border-white/10', 'bg-white border border-[#ffd5dd]'],
  ['bg-[#111]', 'bg-white'],

  // ── Table header rows ──
  ['border-b border-white/10 bg-white/[0.02] text-white/50', 'border-b border-[#ffd5dd] bg-pink-50/60 text-[#3d2428]/50'],
  ['border-b border-white/10 bg-white/[0.01] text-white/50', 'border-b border-[#ffd5dd] bg-pink-50/60 text-[#3d2428]/50'],
  
  // ── Form inputs with bg-black ──
  ['bg-black/45 border border-yellow-500', 'bg-white/90 border border-[#ffd5dd]'],
  ['bg-black/45', 'bg-white/90'],
  ['bg-black/20', 'bg-pink-50/60'],
  ['bg-black/10', 'bg-pink-50/40'],
  ['bg-black/[0.02]', 'bg-pink-50/40'],

  // ── Select option dropdowns ──
  ['className="bg-[#111] text-white"', 'className="bg-white text-[#3d2428]"'],
  ['className="bg-[#111111] text-white"', 'className="bg-white text-[#3d2428]"'],

  // ── Form elements with white/[0.04] backgrounds ──
  ['bg-white/[0.04] border border-white/10 text-white', 'bg-white/90 border border-[#ffd5dd] text-[#3d2428]'],
  ['bg-white/[0.04] border border-white/10', 'bg-white/90 border border-[#ffd5dd]'],
  ['bg-white/[0.01]', 'bg-pink-50/30'],
  ['bg-white/[0.02]', 'bg-pink-50/40'],

  // ── Text colors ──
  ['text-white/60', 'text-[#3d2428]/60'],
  ['text-white/50', 'text-[#3d2428]/50'],
  ['text-white/40', 'text-[#3d2428]/40'],
  ['text-white/35', 'text-[#3d2428]/35'],
  ['text-white/30', 'text-[#3d2428]/30'],
  
  // ── Border colors ──
  ['border-white/10', 'border-[#ffd5dd]'],
  ['border-white/5', 'border-[#ffd5dd]/60'],

  // ── Hover states ──
  ['hover:text-white', 'hover:text-[#3d2428]'],
  ['hover:bg-white/5', 'hover:bg-pink-50/60'],

  // ── Backdrop/overlay (keep dark for modals) ──
  // Don't touch bg-black/80 for modals - those are fine as overlays
];

for (const filePath of files) {
  console.log(`\nProcessing: ${path.basename(filePath)}`);
  let content = fs.readFileSync(filePath, 'utf-8');
  let totalChanges = 0;

  for (const [search, replace] of replacements) {
    const count = content.split(search).length - 1;
    if (count > 0) {
      content = content.replaceAll(search, replace);
      console.log(`  ✓ "${search}" → "${replace}" (${count} occurrences)`);
      totalChanges += count;
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  Total changes: ${totalChanges}`);
}

console.log('\n✅ Done! Both dashboards now use the unified Blossom Pink light theme.');
