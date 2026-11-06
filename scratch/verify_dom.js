const fs = require('fs');
const html = fs.readFileSync('rendered_dom.html', 'utf8');

console.log('Includes AgriSense:', html.includes('AgriSense'));
console.log('Includes Smarter Farming:', html.includes('Smarter Farming'));
console.log('Includes Crop Monitoring:', html.includes('Crop Monitoring'));
console.log('Root div innerHTML length:', html.substring(html.indexOf('<div id="root">')).length);

const sampleClasses = [
  'bg-white',
  'text-[#145A32]',
  'rounded-full',
  'backdrop-blur-md',
  'min-h-screen',
  'max-w-7xl',
  'sticky',
  'flex',
  'grid',
  'border-slate-200'
];

sampleClasses.forEach(c => {
  console.log(c + ':', html.includes(c));
});

