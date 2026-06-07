/**
 * Fix Admin Dashboard Theme Script
 * Converts from isDarkMode conditional to permanent Blossom Pink theme
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Admin/AdminDashboard.jsx');

// Read with auto-detect encoding
let content = fs.readFileSync(filePath);

// Detect BOM and handle encoding
let str;
if (content[0] === 0xFF && content[1] === 0xFE) {
  // UTF-16 LE BOM
  str = content.toString('utf16le').replace(/^\uFEFF/, '');
  console.log('Detected UTF-16 LE encoding');
} else if (content[0] === 0xFE && content[1] === 0xFF) {
  // UTF-16 BE BOM
  str = content.swap16().toString('utf16le').replace(/^\uFEFF/, '');
  console.log('Detected UTF-16 BE encoding');
} else if (content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
  // UTF-8 BOM
  str = content.toString('utf-8').replace(/^\uFEFF/, '');
  console.log('Detected UTF-8 BOM encoding');
} else {
  str = content.toString('utf-8');
  console.log('Detected UTF-8 encoding');
}

console.log(`File length: ${str.length} chars`);
console.log(`First 50 chars: ${JSON.stringify(str.substring(0, 50))}`);

if (str.length < 100) {
  console.error('ERROR: File appears empty or corrupted. Aborting.');
  process.exit(1);
}

// Theme variable replacements
const replacements = [
  // 1. Theme variables - replace isDarkMode conditional with fixed pink theme
  ['const themeBg = isDarkMode ? "bg-[#0a0a0a] text-white" : "bg-[#f5f6f8] text-[#0a0a0a]";',
   'const themeBg = "bg-[var(--bg-gradient)] text-[var(--text-primary)] min-h-screen";'],
  ['const cardBg = isDarkMode ? "bg-[#111] border-white/5" : "bg-white border-black/5 shadow-md shadow-black/[0.02]";',
   'const cardBg = "bg-[var(--card-bg)] border-[var(--card-border)] shadow-xl shadow-pink-100/10";'],
  ['const inputBg = isDarkMode ? "bg-white/[0.04] border-white/10" : "bg-black/[0.02] border-black/10 text-black";',
   'const inputBg = "bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)]";'],
  ['const borderLight = isDarkMode ? "border-white/5" : "border-black/5";',
   'const borderLight = "border-[var(--card-border)]";'],
  ['const textSubtle = isDarkMode ? "text-white/40" : "text-black/40";',
   'const textSubtle = "text-[var(--text-secondary)]";'],
  ['const textTitle = isDarkMode ? "text-white" : "text-black";',
   'const textTitle = "text-[var(--text-primary)] font-bold";'],

  // 2. Main container - add dashboard-pink-theme class
  ['<div className={`min-h-screen pt-24 pb-16 flex flex-col lg:flex-row max-w-7xl mx-auto px-6 gap-8 transition-colors duration-300 ${themeBg}`}>',
   '<div className={`dashboard-pink-theme min-h-screen pt-24 pb-16 flex flex-col lg:flex-row max-w-7xl mx-auto px-6 gap-8 transition-colors duration-300 ${themeBg}`}>'],

  // 3. Sidebar header border
  ['<div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">',
   '<div className={`flex items-center gap-4 mb-8 pb-6 border-b ${borderLight}`}>'],

  // 4. Sidebar icon
  ['<div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#f5d26e] flex items-center justify-center font-bold text-[#0a0a0a] text-xl">',
   '<div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-orange-400 flex items-center justify-center font-bold text-white text-xl shadow-md shadow-orange-500/10">'],

  // 5. Control Center title
  ['<h4 className="font-bold text-sm truncate">Control Center</h4>',
   '<h4 className={`font-bold text-sm truncate ${textTitle}`}>Control Center</h4>'],

  // 6. Active tab styling
  ['? "bg-yellow-500/10 gold border border-yellow-500/20"',
   '? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-extrabold"'],

  // 7. Inactive tab with isDarkMode conditional  
  [': isDarkMode \r\n                      ? "text-white/50 hover:text-white hover:bg-white/5 border border-transparent" \r\n                      : "text-black/55 hover:text-black hover:bg-black/5 border border-transparent"',
   ': "text-[#3d2428]/65 hover:text-emerald-700 hover:bg-emerald-500/5 border border-transparent"'],

  // 7b. Alternative line ending format
  [': isDarkMode \n                      ? "text-white/50 hover:text-white hover:bg-white/5 border border-transparent" \n                      : "text-black/55 hover:text-black hover:bg-black/5 border border-transparent"',
   ': "text-[#3d2428]/65 hover:text-emerald-700 hover:bg-emerald-500/5 border border-transparent"'],

  // 8. Command palette dark mode toggle
  ['{ label: "Toggle Dark / Light Console Style", action: () => { setIsDarkMode(!isDarkMode); setShowCommandPalette(false); } }',
   '{ label: "Theme: Blossom Pink Active", action: () => { setShowCommandPalette(false); } }'],

  // 9. Badge counts - onboarding
  ["'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'",
   "'bg-orange-500 text-white shadow-lg shadow-orange-500/20'"],

  // 10. Header border isDarkMode
  ['${isDarkMode ? "border-white/5" : "border-black/5"}',
   '${borderLight}'],

  // 11. Search icon isDarkMode
  ['${isDarkMode ? "text-white/30" : "text-black/35"}',
   'text-[#3d2428]/35'],

  // 12. Status text isDarkMode
  ['${isDarkMode ? "text-white/40" : "text-black/45"}',
   'text-[#3d2428]/45'],

  // ── Bulk dark-mode color replacements ──
  // Table headers
  ['border-b border-white/10 bg-white/[0.02] text-white/50', 'border-b border-[#ffd5dd] bg-pink-50/60 text-[#3d2428]/50'],
  ['border-b border-white/10 bg-white/[0.01] text-white/50', 'border-b border-[#ffd5dd] bg-pink-50/60 text-[#3d2428]/50'],
  
  // Form inputs
  ['bg-black/45 border border-yellow-500', 'bg-white/90 border border-[#ffd5dd]'],
  ['bg-black/45', 'bg-white/90'],
  ['bg-black/20', 'bg-pink-50/60'],
  ['bg-black/10', 'bg-pink-50/40'],
  ['bg-black/[0.02]', 'bg-pink-50/40'],

  // Select option dropdowns
  ['className="bg-[#111] text-white"', 'className="bg-white text-[#3d2428]"'],
  ['className="bg-[#111111] text-white"', 'className="bg-white text-[#3d2428]"'],

  // Form elements
  ['bg-white/[0.04] border border-white/10 text-white', 'bg-white/90 border border-[#ffd5dd] text-[#3d2428]'],
  ['bg-white/[0.04] border border-white/10', 'bg-white/90 border border-[#ffd5dd]'],
  ['bg-white/[0.01]', 'bg-pink-50/30'],
  ['bg-white/[0.02]', 'bg-pink-50/40'],

  // Modal backgrounds
  ['bg-[#111111] border border-white/10', 'bg-white border border-[#ffd5dd]'],
  ['bg-[#111] border border-white/10', 'bg-white border border-[#ffd5dd]'],
  ['bg-[#111]', 'bg-white'],

  // Text colors
  ['text-white/60', 'text-[#3d2428]/60'],
  ['text-white/50', 'text-[#3d2428]/50'],
  ['text-white/40', 'text-[#3d2428]/40'],
  ['text-white/35', 'text-[#3d2428]/35'],
  ['text-white/30', 'text-[#3d2428]/30'],
  
  // Border colors
  ['border-white/10', 'border-[#ffd5dd]'],
  ['border-white/5', 'border-[#ffd5dd]/60'],
  ['border-black/5', 'border-[#ffd5dd]/60'],

  // Hover states
  ['hover:text-white', 'hover:text-[#3d2428]'],
  ['hover:bg-white/5', 'hover:bg-pink-50/60'],
  ['hover:bg-black/5', 'hover:bg-pink-50/60'],

  // Text colors for light mode
  ['text-black/55', 'text-[#3d2428]/55'],
  ['text-black/45', 'text-[#3d2428]/45'],
  ['text-black/40', 'text-[#3d2428]/40'],
  ['text-black/35', 'text-[#3d2428]/35'],
  ['text-black/5', 'text-[#ffd5dd]/60'],
];

let totalChanges = 0;
for (const [search, replace] of replacements) {
  const count = str.split(search).length - 1;
  if (count > 0) {
    str = str.replaceAll(search, replace);
    console.log(`  ✓ (${count}) ${JSON.stringify(search).substring(0, 70)}...`);
    totalChanges += count;
  }
}

// Now also handle the dark mode toggle replacement
// Find and replace the style toggle block
const toggleOld = `        {/* Local light/dark style toggle */}
        <div className={\`mt-8 pt-4 border-t flex items-center justify-between \${borderLight}\`}>
          <span className={\`text-[9px] uppercase tracking-widest font-bold \${textSubtle}\`}>Style Theme</span>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}`;
const toggleNew = `        {/* Theme badge */}
        <div className={\`mt-8 pt-4 border-t flex items-center justify-between \${borderLight}\`}>
          <span className={\`text-[9px] uppercase tracking-widest font-bold \${textSubtle}\`}>Theme</span>
          <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 px-2 py-1 rounded-lg border border-pink-500/15">Blossom</span>`;

if (str.includes(toggleOld)) {
  str = str.replace(toggleOld, toggleNew);
  console.log('  ✓ Replaced dark mode toggle with theme badge');
  totalChanges++;
}

// Remove isDarkMode state
str = str.replace('  const [isDarkMode, setIsDarkMode] = useState(false);\r\n', '');
str = str.replace('  const [isDarkMode, setIsDarkMode] = useState(false);\n', '');

// Remove Sun/Moon imports
str = str.replace('  Sun,\r\n  Moon,\r\n', '');
str = str.replace('  Sun,\n  Moon,\n', '');

// Write back in UTF-8
fs.writeFileSync(filePath, str, 'utf-8');
console.log(`\nTotal changes: ${totalChanges}`);
console.log('✅ Admin Dashboard theme updated to Blossom Pink.');
