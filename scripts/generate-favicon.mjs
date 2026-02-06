import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const inputPath = path.join(rootDir, 'public', 'logo.png');
const outputPath = path.join(rootDir, 'public', 'favicon.png');

async function generateCircularFavicon() {
  const size = 180;

  // 원형 마스크 SVG 생성
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
    </svg>`
  );

  await sharp(inputPath)
    .resize(size, size, { fit: 'cover' })
    .composite([{
      input: circleMask,
      blend: 'dest-in'
    }])
    .png()
    .toFile(outputPath);

  console.log('원형 파비콘 생성 완료:', outputPath);
}

generateCircularFavicon().catch(console.error);
