#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = './src/pages/changelog';

// Get command line argument
const shouldFix = process.argv.includes('--fix');

const files = fs.readdirSync(CHANGELOG_PATH).filter(f => f.endsWith('.mdx'));

console.log(`${shouldFix ? 'Fixing' : 'Checking'} ${files.length} MDX files...\n`);

let fixedCount = 0;
let issuesFound = 0;

files.forEach(filename => {
  const filePath = path.join(CHANGELOG_PATH, filename);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Split into frontmatter and body
  const parts = content.split('---\n');
  if (parts.length < 3) {
    console.log(`⚠️  ${filename} - Invalid frontmatter, skipping`);
    return;
  }
  
  const frontmatter = parts[1];
  const body = parts.slice(2).join('---\n');
  
  let originalBody = body;
  let fixedBody = body;
  
  // Check for issues
  const issues = [];
  
  // Check for < or > outside of JSX
  const nonJsxAngles = body.match(/<(?![a-zA-Z/])|>(?![^<]*>)/g);
  if (nonJsxAngles) {
    issues.push(`Contains < or > that might need escaping`);
  }
  
  // Check for { or } outside of JSX
  const lines = body.split('\n');
  let inCodeBlock = false;
  
  lines.forEach((line, i) => {
    // Track code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    
    if (!inCodeBlock && !line.includes('<') && !line.includes('import')) {
      if (line.match(/[^\\{]{[^{]/) || line.match(/[^\\}]}[^}]/)) {
        issues.push(`Line ${i + 1}: Might have unescaped { or }`);
      }
    }
  });
  
  if (issues.length > 0) {
    issuesFound++;
    console.log(`⚠️  ${filename}:`);
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
  }
  
  // Fix if --fix flag is passed
  if (shouldFix && issues.length > 0) {
    inCodeBlock = false;
    
    const fixedLines = lines.map(line => {
      // Track code blocks
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return line;
      }
      
      // Don't modify code blocks or JSX lines
      if (inCodeBlock || line.includes('<') || line.includes('import')) {
        return line;
      }
      
      // Escape unescaped { and }
      let fixed = line;
      
      // Replace { that are NOT already escaped
      fixed = fixed.replace(/([^\\]){(?![{])/g, '$1\\{');
      fixed = fixed.replace(/^{(?![{])/g, '\\{');
      
      // Replace } that are NOT already escaped
      fixed = fixed.replace(/([^\\])}(?![}])/g, '$1\\}');
      fixed = fixed.replace(/^}(?![}])/g, '\\}');
      
      return fixed;
    });
    
    fixedBody = fixedLines.join('\n');
    
    // Also escape < and >
    fixedBody = fixedBody.replace(/\s<\s/g, ' &lt; ');
    fixedBody = fixedBody.replace(/\s>\s/g, ' &gt; ');
    
    // Reconstruct the file
    const newContent = `---\n${frontmatter}---\n${fixedBody}`;
    
    if (originalBody !== fixedBody) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✅ Fixed ${filename}`);
      fixedCount++;
    }
  } else if (issues.length === 0) {
    console.log(`✅ ${filename}`);
  }
});

if (shouldFix) {
  console.log(`\n🎉 Done! Fixed ${fixedCount} files.`);
} else {
  console.log(`\n${issuesFound} files with issues found.`);
  if (issuesFound > 0) {
    console.log(`\nRun with --fix flag to automatically fix them:`);
    console.log(`  node check-mdx.cjs --fix`);
  }
}