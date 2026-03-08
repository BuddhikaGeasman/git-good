#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const OBSIDIAN_PATH = '/Users/bgeasman/Documents/Obsidian Vault/Tech & Learning/Dev Log';
const ASTRO_CHANGELOG_PATH = './src/pages/changelog';

// Ensure the destination directory exists
if (!fs.existsSync(ASTRO_CHANGELOG_PATH)) {
  fs.mkdirSync(ASTRO_CHANGELOG_PATH, { recursive: true });
}

// Read all files from Obsidian folder
const files = fs.readdirSync(OBSIDIAN_PATH);

// Filter for changelog files (ignore Old Dev Log folder and non-md files)
const changelogFiles = files.filter(file => {
  return file.startsWith('changelog-') && file.endsWith('.md');
});

console.log(`Found ${changelogFiles.length} changelog files`);

changelogFiles.forEach(filename => {
  const sourcePath = path.join(OBSIDIAN_PATH, filename);
  
  // Read the file
  let content = fs.readFileSync(sourcePath, 'utf-8');
  
  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    console.log(`⚠️  Skipping ${filename} - no frontmatter found`);
    return;
  }
  
  const frontmatter = frontmatterMatch[1];
  const body = content.substring(frontmatterMatch[0].length).trim();
  
  // Extract date and title from frontmatter
  const titleMatch = frontmatter.match(/title:\s*(.+)/);
  const dateMatch = frontmatter.match(/date:\s*(\d{4}-\d{2}-\d{2})/);
  const featuresMatch = frontmatter.match(/features:\s*(\[.*\])/);
  
  if (!dateMatch) {
    console.log(`⚠️  Skipping ${filename} - no date found`);
    return;
  }
  
  const title = titleMatch ? titleMatch[1] : filename.replace('changelog-', '').replace('.md', '');
  const date = dateMatch[1];
  const features = featuresMatch ? featuresMatch[1] : '[]';
  
  // Remove the duplicate heading (# 📝 February 12, 2026)
  const bodyWithoutHeading = body.replace(/^#\s*📝\s*.+\n\n?/, '');
  
  // Create new frontmatter in Astro format
  const newFrontmatter = `---
layout: ../../layouts/Layout.astro
title: "${title}"
date: ${date}
tags: [changelog]
features: ${features}
---`;
  
  // Combine new frontmatter with body
  const newContent = `${newFrontmatter}\n\n${bodyWithoutHeading}`;
  
  // Create new filename (convert date format: DD.MM.YYYY -> YYYY-MM-DD)
  const destFilename = `${date}.mdx`;
  const destPath = path.join(ASTRO_CHANGELOG_PATH, destFilename);
  
  // Write the file
  fs.writeFileSync(destPath, newContent, 'utf-8');
  
  console.log(`✅ Converted ${filename} → ${destFilename}`);
});

console.log(`\n🎉 Done! Synced ${changelogFiles.length} changelogs to ${ASTRO_CHANGELOG_PATH}`);