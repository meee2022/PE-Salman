/**
 * Generate PWA icons from ministry-logo.jpeg using jimp v1
 */
const { Jimp } = require("jimp");
const path = require("path");

const INPUT = path.join(__dirname, "../public/ministry-logo.jpeg");
const OUT_DIR = path.join(__dirname, "../public/icons");

async function main() {
  console.log("Reading source image:", INPUT);
  const img = await Jimp.read(INPUT);

  // icon-192.png
  const img192 = img.clone().resize({ w: 192, h: 192 });
  await img192.write(path.join(OUT_DIR, "icon-192.png"));
  console.log("Generated icon-192.png");

  // icon-512.png
  const img512 = img.clone().resize({ w: 512, h: 512 });
  await img512.write(path.join(OUT_DIR, "icon-512.png"));
  console.log("Generated icon-512.png");

  // apple-touch-icon.png (180x180)
  const img180 = img.clone().resize({ w: 180, h: 180 });
  await img180.write(path.join(OUT_DIR, "apple-touch-icon.png"));
  console.log("Generated apple-touch-icon.png");

  // icon-maskable-512.png (512x512 with 20% padding for maskable)
  const CANVAS = 512;
  const PADDING = Math.floor(CANVAS * 0.2); // 20% padding each side
  const INNER = CANVAS - PADDING * 2; // inner image size

  const maskable = new Jimp({ width: CANVAS, height: CANVAS, color: 0xffffffff }); // white background
  const inner = img.clone().resize({ w: INNER, h: INNER });
  maskable.composite(inner, PADDING, PADDING);
  await maskable.write(path.join(OUT_DIR, "icon-maskable-512.png"));
  console.log("Generated icon-maskable-512.png");

  console.log("\nAll icons generated successfully in public/icons/");
}

main().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
