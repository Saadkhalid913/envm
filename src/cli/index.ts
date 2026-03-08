#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./init.js";
import { listCommand } from "./list.js";
import { getCommand, setCommand, unsetCommand } from "./get-set.js";
import { diffCommand } from "./diff.js";
import { mergeCommand } from "./merge.js";
import { cloneCommand } from "./clone.js";
import { templateCommand } from "./template.js";
import { validateCommand } from "./validate.js";
import { schemaCommand } from "./schema.js";
import { snapshotCommand } from "./snapshot.js";
import { sortCommand } from "./sort.js";
import { normalizeCommand } from "./normalize.js";
import { updateCommand } from "./update.js";

const program = new Command();

program
  .name("envm")
  .description("CLI tool for managing .env files — compare, merge, snapshot, validate")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(listCommand);
program.addCommand(getCommand);
program.addCommand(setCommand);
program.addCommand(unsetCommand);
program.addCommand(diffCommand);
program.addCommand(mergeCommand);
program.addCommand(cloneCommand);
program.addCommand(templateCommand);
program.addCommand(validateCommand);
program.addCommand(schemaCommand);
program.addCommand(snapshotCommand);
program.addCommand(sortCommand);
program.addCommand(normalizeCommand);
program.addCommand(updateCommand);

program.parse();
