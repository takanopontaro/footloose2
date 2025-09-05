#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { program } = require('commander');
const { eject } = require('./commands/eject');
const { start } = require('./commands/start');

const manifestStr = readFileSync(`${__dirname}/package.json`, 'utf-8');
const manifest = JSON.parse(manifestStr);

program
  .name('@footloose2/app')
  .description('Here 🕺 We 💃 Go 👟')
  .version(manifest.version)
  .usage('<command> [options]')
  .helpOption('-h, --help', 'Display help for command')
  .addHelpCommand(false);

program
  .command('start')
  .description('Start Footloose2 server')
  .option('-p, --port <port>', 'Specify server port', '3000')
  .option(
    '-t, --time-style <format>',
    'Specify custom format for date-time',
    '%y/%m/%d %H:%M:%S',
  )
  .option('-b, --bookmark <file>', 'Specify bookmark json file')
  .option('-s, --style <file>', 'Specify user style file')
  .option('-c, --config <file>', 'Specify user config js/ts file')
  .action(start);

program
  .command('eject')
  .description('Eject built-in config files for customization')
  .argument('[dir]', 'Output directory for config files', '.')
  .action(eject);

program.parse();
