const Tesseract = require('tesseract.js');
const fs = require('fs');

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('File not found');
    process.exit(1);
  }
  
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
    console.log(text);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
