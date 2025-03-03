const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'coverage', 'generatedOutput'];
const EXCLUDE_FILES = ['.DS_Store', 'Thumbs.db', 'package-lock.json', 'generate.js'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];

/* Helper function to prompt user */
async function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
}

/* Recursively gets all files (excluding directories) */
function getAllFiles(dirPath, fileArray = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory() && !EXCLUDE_DIRS.includes(file)) {
      getAllFiles(filePath, fileArray);
    } else if (stats.isFile() && !EXCLUDE_FILES.includes(file)) {
      fileArray.push(filePath);
    }
  });

  return fileArray;
}

/* Prompts user for folder selection and includes all files within selected folders */
async function selectFiles(currentDir) {
  const selectedFiles = [];
  const folders = [];
  const files = [];

  /* Separate folders and files */
  const items = await fs.promises.readdir(currentDir);
  for (const item of items) {
    const itemPath = path.join(currentDir, item);
    const stats = await fs.promises.stat(itemPath);

    if (stats.isDirectory() && !EXCLUDE_DIRS.includes(item)) {
      folders.push(itemPath);
    } else if (stats.isFile() && !EXCLUDE_FILES.includes(item)) {
      files.push(itemPath);
    }
  }

  /* Prompt for folders */
  for (const folder of folders) {
    const includeFolder = await promptUser(`Include folder '${path.basename(folder)}'? (y/n) `);
    if (includeFolder === 'y') {
      const folderFiles = getAllFiles(folder);
      selectedFiles.push(...folderFiles);
    }
  }

  /* Prompt for individual files */
  for (const file of files) {
    const includeFile = await promptUser(`Include file '${path.basename(file)}'? (y/n) `);
    if (includeFile === 'y') {
      selectedFiles.push(file);
    }
  }

  return selectedFiles;
}

/* Merges selected files into a single output file, listing image filenames instead of content */
function mergeFiles(files, outputFilePath) {
  let mergedContent = '';

  files.forEach(filePath => {
    if (fs.statSync(filePath).isFile()) {  // Ensuring it's a file
      const ext = path.extname(filePath).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        mergedContent += `\n\n===== ${filePath} =====\n\n`; // Only include image filename
      } else {
        const content = fs.readFileSync(filePath, 'utf-8');
        mergedContent += `\n\n===== ${filePath} =====\n\n` + content;
      }
    }
  });

  fs.writeFileSync(outputFilePath, mergedContent);
}

/* Ensures output directory exists */
function createOutputDir(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
}

/* Generates a timestamped filename */
function getTimestampedFileName() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  return `merged-repo-${timestamp}.txt`;
}

/* Main function */
async function main() {
  const args = process.argv.slice(2);
  const skipPrompt = args.includes('-all');
  const currentDir = process.cwd();
  const outputDir = path.join(currentDir, 'generatedOutput');
  createOutputDir(outputDir);

  let selectedFiles;
  if (skipPrompt) {
    console.log('Including all files (skipping prompts)...');
    selectedFiles = getAllFiles(currentDir);
  } else {
    console.log('Select files and folders to include in the merge:');
    selectedFiles = await selectFiles(currentDir);
  }

  /* Ensure only files are passed to mergeFiles */
  selectedFiles = selectedFiles.filter(filePath => fs.statSync(filePath).isFile());

  const outputFilePath = path.join(outputDir, getTimestampedFileName());
  mergeFiles(selectedFiles, outputFilePath);

  console.log(`Merged repository saved to: ${outputFilePath}`);
  rl.close();
}

/* Run script */
main().catch(console.error);
