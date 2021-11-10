#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const copydir = require('copy-dir');
const fs = require('fs');
const mkdirp = require('mkdirp');

const parseYaml = (val, pre) => {
  const result = path.resolve(val);
  const split = result.split('\\');
  const name = split[split.length - 1];
  return { ...pre, [name]: result };
};

program
  .option('-c, --config <location>', 'Location of the exported Insomnia JSON config.')
  .option('-l, --logo <location>', 'Project logo location (48x48px PNG).')
  .option('-o, --output <location>', 'Where to save the file (defaults to current working directory).')
  .option('-y, --yaml <yamls>', 'Location of YAML files.', parseYaml, {})
  .parse(process.argv);

const { config, logo, output, yaml } = program;

if (!config && Object.keys(yaml).length === 0) {
  console.log('You must provide an exported Insomnia config (Preferences -> Data -> Export Data -> Current Workspace).');
  process.exit(1);
}

const PACKAGE_DIST_PATH = path.resolve(__dirname, '..', 'public');
const outputPath = output ? path.join(process.cwd(), output) : process.cwd();
const logoPath = logo && path.join(process.cwd(), logo);

if (!config) {
  const glob = require('glob');
  const yamljs = require('js-yaml');
  const fs = require('fs');

  const snakeCase = (string) => {
    return string
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map((word) => word.toLowerCase())
      .join('_');
  };

  Object.entries(yaml).forEach(([key, val], i) => {
    const ymls = glob.sync(val + '\\.insomnia\\**\\*.yml', { dot: true });

    // Get document, or throw exception on error
    const jsonObj = { resources: [] };
    try {
      for (const yml of ymls) {
        const doc = yamljs.load(fs.readFileSync(yml, 'utf8'));
        doc._type = snakeCase(doc.type);
        delete doc.type;
        jsonObj.resources.push(doc);
      }
      mkdirp.sync(outputPath);
      fs.writeFileSync(path.join(outputPath, `${key}.json`), JSON.stringify(jsonObj));
    } catch (e) {
      console.log(e);
    }
  });

  process.exit();
}

const configPath = path.join(process.cwd(), config);

console.log('Getting files ready...');

mkdirp(outputPath, err => {
  if (err) {
    console.error(err);
    process.exit(127);
  }

  copydir.sync(PACKAGE_DIST_PATH, outputPath, {
    utimes: false,
    mode: false,
    cover: true
  });

  console.log('Adding Insomnia JSON...');

  fs.copyFileSync(configPath, path.join(outputPath, 'insomnia.json'));

  if (logoPath) {
    console.log('Adding custom logo...');
    fs.copyFileSync(logoPath, path.join(outputPath, 'logo.png'));
  }

  console.log('\n * * * Done! * * *\nYour documentation has been created and it\'s ready to be deployed!');

  process.exit();
});
