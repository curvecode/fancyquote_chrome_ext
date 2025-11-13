const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');

const distDir = 'dist';

// Get build mode from command line arguments
const args = process.argv.slice(2);
const modeArg = args.find(arg => arg.startsWith('--mode='));
const buildMode = modeArg ? modeArg.split('=')[1] : 'development';
const isProduction = buildMode === 'production';

console.log(`🚀 Build mode: ${buildMode.toUpperCase()}`);

// HTML files to optimize and copy
const htmlFiles = [
  'popup.html',
  'index.html'
];

// Static files to copy without modification
const staticFiles = [
  'manifest.json', 'icon16.png'
];

// HTML minification options - more aggressive for production
const htmlMinifyOptions = {
  collapseWhitespace: true,
  removeComments: isProduction,
  removeRedundantAttributes: isProduction,
  removeScriptTypeAttributes: isProduction,
  removeStyleLinkTypeAttributes: isProduction,
  minifyCSS: isProduction,
  minifyJS: isProduction,
  useShortDoctype: true,
  removeEmptyAttributes: isProduction,
  removeOptionalTags: false, // Keep for better compatibility
  caseSensitive: true,
  minifyURLs: false,
  // Additional production optimizations
  removeAttributeQuotes: isProduction,
  removeEmptyElements: isProduction,
  sortAttributes: isProduction,
  sortClassName: isProduction
};

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

async function processFiles() {
  console.log('📁 Processing files for distribution...\n');

  // Process HTML files with optimization
  for (const file of htmlFiles) {
    if (fs.existsSync(file)) {
      try {
        const htmlContent = fs.readFileSync(file, 'utf8');
        const originalSize = Buffer.byteLength(htmlContent, 'utf8');
        
        let processedContent = htmlContent;
        
        if (isProduction) {
          console.log(`🔧 Optimizing ${file} for production...`);
          processedContent = await minify(htmlContent, htmlMinifyOptions);
        } else {
          console.log(`📋 Copying ${file} for development...`);
          // In development, only do basic minification to preserve readability
          processedContent = await minify(htmlContent, {
            collapseWhitespace: false,
            removeComments: false,
            minifyCSS: false,
            minifyJS: false
          });
        }
        
        const processedSize = Buffer.byteLength(processedContent, 'utf8');
        const compressionRatio = ((originalSize - processedSize) / originalSize * 100).toFixed(1);
        
        fs.writeFileSync(path.join(distDir, file), processedContent, 'utf8');
        
        if (isProduction && compressionRatio > 0) {
          console.log(`   ✅ ${file}: ${originalSize} bytes → ${processedSize} bytes (${compressionRatio}% reduction)`);
        } else {
          console.log(`   ✅ ${file}: ${originalSize} bytes (preserved formatting for development)`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${file}:`, error.message);
        // Fallback: copy original file if processing fails
        fs.copyFileSync(file, path.join(distDir, file));
        console.log(`   📋 Copied original ${file} as fallback`);
      }
    } else {
      console.warn(`   ⚠️  File ${file} not found`);
    }
  }

  // Copy static files without modification
  console.log('\n📋 Copying static files...');
  staticFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(distDir, file));
      console.log(`   ✅ Copied ${file}`);
    } else {
      console.warn(`   ⚠️  File ${file} not found`);
    }
  });

  // Handle icon files
  await handleIcons();

  // Show completion message with tips
  console.log('\n🎉 File processing completed successfully!');
  
  if (!isProduction) {
    console.log('\n💡 Tips:');
    console.log('   • Use "npm run build:prod" for optimized production build');
    console.log('   • Add actual PNG icons for better user experience');
  }
}

async function handleIcons() {
  console.log('\n🎨 Handling icons...');
  
  const iconSizes = ['icon16.png', 'icon48.png', 'icon128.png'];
  let hasIcons = false;
  
  for (const iconFile of iconSizes) {
    const iconPath = iconFile;
    const distIconPath = path.join(distDir, iconFile);
    
    if (fs.existsSync(iconPath)) {
      fs.copyFileSync(iconPath, distIconPath);
      console.log(`   ✅ Copied ${iconFile}`);
      hasIcons = true;
    }
  }
  
  if (!hasIcons) {
    // Create a basic data URL icon for the manifest (won't work for notifications though)
    console.log('   ⚠️  No icon files found. Creating placeholder...');
    
    // Create an empty file to prevent file not found errors
    const placeholderPath = path.join(distDir, 'icon16.png');
    fs.writeFileSync(placeholderPath, '');
    
    console.log('   📋 Created placeholder icon16.png');
    console.log('   💡 Add real PNG icons (16x16, 48x48, 128x128) for production use');
  }
}

// Run the process
processFiles().catch(error => {
  console.error('❌ Error during file processing:', error);
  process.exit(1);
});