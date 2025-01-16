import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const ICON_SIZES = [16, 48, 128];
const SOURCE_SVG = path.join(__dirname, '../src/icons/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Read the SVG file
    const svgBuffer = await fs.readFile(SOURCE_SVG);

    // Generate each size
    await Promise.all(
      ICON_SIZES.map(async (size) => {
        const outputPath = path.join(OUTPUT_DIR, `icon${size}.png`);
        await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toFile(outputPath);
        console.log(`Generated ${size}x${size} icon at ${outputPath}`);
      })
    );

    console.log('Icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Run the script
generateIcons();