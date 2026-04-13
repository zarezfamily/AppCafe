const fs = require('fs');
const path = require('path');

const { aboutPages } = require('./src/data/aboutPages');
const { generatedBlogPostPages } = require('./src/data/generatedBlogPostPages');
const { renderBlogIndexPage } = require('./src/templates/blogIndexPage');
const { renderBlogPostPage } = require('./src/templates/blogPostPage');
const { legalPages } = require('./src/data/legalPages');
const { renderAboutPage } = require('./src/templates/aboutPage');
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

function buildAboutPages() {
  aboutPages.forEach((page) => {
    writeFile(`${page.slug}.html`, renderAboutPage(page));
  });
}

function buildBlogPages() {
  writeFile(path.join('blog', 'index.html'), renderBlogIndexPage());

  generatedBlogPostPages.forEach((page) => {
    writeFile(path.join('blog', `${page.slug}.html`), renderBlogPostPage(page));
  });
}

buildAboutPages();
buildBlogPages();
buildLegalPages();
