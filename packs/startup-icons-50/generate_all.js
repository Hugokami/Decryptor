const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Full SVG Animation Suite Generation...');

try {
    console.log('\n--- Generating Basic Styles (Draw, Pulse, Color Cycle) ---');
    execSync('node animate-batch.js', { stdio: 'inherit', cwd: __dirname });

    console.log('\n--- Generating Premium Styles (Neon, Float, Holographic) ---');
    execSync('node animate-batch-premium.js', { stdio: 'inherit', cwd: __dirname });

    console.log('\n✅ All 300 SVG variants generated successfully!');
} catch (error) {
    console.error('\n❌ Generation failed:', error.message);
    process.exit(1);
}
