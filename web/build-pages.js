const fs = require('fs');
const path = require('path');

const { legalPages } = require('./src/data/legalPages');
const { renderLegalPage } = require('./src/templates/legalPage');

const webRoot = __dirname;

function writeFile(relativePath, contents) {
  const filePath = path.join(webRoot, relativePath);
  fs.writeFileSync(filePath, contents, 'utf8');
}

function buildLegalPages() {
  legalPages.forEach((page) => {
    writeFile(`${page.slug}.html`, renderLegalPage(page));
  });
}

buildLegalPages();
