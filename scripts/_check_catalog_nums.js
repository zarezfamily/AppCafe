// Extract catalog entries by number from the HTML
const fs = require('fs');
const html = fs.readFileSync('web/catalogo.html', 'utf8');

const nums = [
  560, 561, 623, 628, 634, 671, 738, 739, 740, 746, 788, 790, 797, 900, 901, 902, 904, 905, 906,
  912, 918, 919, 924, 925, 926, 927, 929, 1069, 1148, 1152, 1170, 1178, 1247, 1250, 1301, 1332,
  1341, 1348, 1353, 1354,
];

for (const n of nums) {
  const marker = `>#${n}<`;
  const idx = html.indexOf(marker);
  if (idx < 0) {
    console.log(`#${n}: NOT FOUND IN HTML`);
    continue;
  }
  // Go back to find the card div
  const cardStart = html.lastIndexOf('<div class="card"', idx);
  const cardEnd = html.indexOf('</div>\n</div>', idx);
  const card = html.substring(cardStart, cardEnd + 20);

  // Extract data-id
  const idMatch = card.match(/data-id="([^"]*)"/);
  const brandMatch = card.match(/class="brand">([^<]*)/);
  const nameMatch = card.match(/class="name">([^<]*)/);
  const imgMatch = card.match(/src="([^"]*)"/);

  console.log(
    `#${n}: id=${idMatch?.[1]} | brand="${brandMatch?.[1]}" | name="${nameMatch?.[1]}" | img=${imgMatch?.[1]?.substring(0, 80)}`
  );
}

// Also find El Corte Inglés Selection entries
console.log('\n=== EL CORTE INGLÉS SELECTION ===');
const eciRegex = /El Corte Ingl/g;
let match;
while ((match = eciRegex.exec(html)) !== null) {
  const start = html.lastIndexOf('<div class="card"', match.index);
  const numMatch = html.substring(start, match.index + 200).match(/#(\d+)/);
  const idMatch = html.substring(start, match.index + 200).match(/data-id="([^"]*)"/);
  const nameMatch = html.substring(start, match.index + 500).match(/class="name">([^<]*)/);
  if (numMatch) console.log(`  #${numMatch[1]}: ${idMatch?.[1]} | ${nameMatch?.[1]}`);
}

// Also find SUPRACAFÉ and Supracafé
console.log('\n=== SUPRACAFÉ ===');
const supraRegex = /[Ss]upracaf/gi;
while ((match = supraRegex.exec(html)) !== null) {
  const start = html.lastIndexOf('<div class="card"', match.index);
  const numMatch = html.substring(start, match.index + 200).match(/#(\d+)/);
  const idMatch = html.substring(start, match.index + 200).match(/data-id="([^"]*)"/);
  if (numMatch) console.log(`  #${numMatch[1]}: ${idMatch?.[1]}`);
}
