#!/usr/bin/env node --no-warnings

import { Command } from 'commander';
import { config } from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import OpenAI from 'openai';
import { simpleGit } from 'simple-git';
import type { SimpleGit, StatusResult } from 'simple-git';
import chalk from 'chalk';
import ora from 'ora';

// Type definitions
/** Configuration object for storing API keys and model */
interface Config {
  apiKey: string;
  model: string;
}

/** Command line options for the CLI */
interface CommandOptions {
  key?: string;
  model?: string;
}

/** Valid key responses for interactive mode */
type KeyResponse = 'c' | 'e' | 'q';

/** Extended Error interface for Git operations */
interface GitError extends Error {
  git?: boolean;
  stderr?: string;
}

/** OpenAI chat message structure */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

config();

const git = simpleGit() as SimpleGit;

// Constants
/** Directory for storing configuration */
const CONFIG_DIR = path.join(os.homedir(), '.gpt-auto-commit');
/** Configuration file path */
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const execPromise = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read package.json
const packageJson = JSON.parse(
  await fs.readFile(path.join(__dirname, '../package.json'), 'utf8')
);

/**
 * Ensures the configuration directory and file exist
 * Creates them if they don't exist with default values
 * @throws {Error} If unable to create config directory or file
 */
async function ensureConfig(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    try {
      await fs.access(CONFIG_FILE);
    } catch {
      await fs.writeFile(
        CONFIG_FILE,
        JSON.stringify({ apiKey: '', model: 'gpt-4o-mini' } as Config, null, 2)
      );
    }
  } catch (error) {
    console.error('Error creating config:', error);
    process.exit(1);
  }
}

/**
 * Retrieves the current configuration
 * @returns {Promise<Config>} The configuration object
 */
async function getConfig(): Promise<Config> {
  try {
    const config = await fs.readFile(CONFIG_FILE, 'utf8');
    const parsedConfig = JSON.parse(config) as Config;
    // Ensure model is set if it doesn't exist in old configs
    if (!parsedConfig.model) {
      parsedConfig.model = 'gpt-4o-mini';
    }
    return parsedConfig;
  } catch {
    return { apiKey: '', model: 'gpt-4o-mini' };
  }
}

/**
 * Sets the OpenAI API key in the configuration
 * @param {string} apiKey - The OpenAI API key to store
 */
async function setApiKey(apiKey: string): Promise<void> {
  const config = await getConfig();
  config.apiKey = apiKey;
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(chalk.green('API key saved successfully!'));
}

/**
 * Sets the OpenAI model in the configuration
 * @param {string} model - The OpenAI model to use
 */
async function setModel(model: string): Promise<void> {
  const config = await getConfig();
  config.model = model;
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(chalk.green(`Model set to: ${model}`));
}

/**
 * Gets the git diff of staged changes, excluding specified file types
 * @returns {Promise<string>} The formatted git diff
 */
async function getDiff(): Promise<string> {
  const status: StatusResult = await git.status();
  const stagedFiles = status.staged;

  if (status.files.length > stagedFiles.length) {
    console.log(chalk.yellow('Note: Unstaged changes will be ignored'));
  }

  /** Patterns for files to exclude from diff */
  const skipPatterns: RegExp[] = [
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.min\.(js|css)$/,
    /\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/,
    /\.map$/,
    /dist\//,
    /build\//,
    /node_modules\//,
  ];

  const shouldIncludeFile = (file: string): boolean => {
    return !skipPatterns.some((pattern) => pattern.test(file));
  };

  let diff = '';

  if (stagedFiles.length > 0) {
    const relevantStaged = stagedFiles.filter(shouldIncludeFile);
    if (relevantStaged.length > 0) {
      diff += await git.diff([
        '--cached',
        '--unified=1',
        '--no-prefix',
        '--',
        ...relevantStaged,
      ]);
    }
  }

  return diff
    .replace(/^old mode \d+\n^new mode \d+\n/gm, '')
    .replace(/^index [0-9a-f]+\.\.[0-9a-f]+/gm, '')
    .replace(/^Binary files .* differ\n/gm, '')
    .replace(/^diff --git .*\n/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Generates a commit message using OpenAI's API
 * @param {string} diff - The git diff to generate a message for
 * @returns {Promise<string>} The generated commit message
 * @throws {Error} If API key is not set or API request fails
 */
async function generateCommitMessage(diff: string): Promise<string> {
  const config = await getConfig();

  if (!config.apiKey) {
    console.error(
      chalk.red('No API key found. Please set your OpenAI API key first:')
    );
    console.log(chalk.yellow('gpt-auto-commit config --key YOUR_API_KEY'));
    process.exit(1);
  }

  const openai = new OpenAI({
    apiKey: config.apiKey,
  });

  const spinner = ora({ spinner: 'arc' }).start();

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a helpful assistant that generates clear and concise git commit messages. Follow conventional commits format. Focus on the main changes and their purpose. Only return a single-line commit message with no additional details, bullet points, or descriptions.',
      },
      {
        role: 'user',
        content: `Changes:\n\n${diff}`,
      },
    ];

    const response = await openai.chat.completions.create({
      model: config.model,
      messages,
      max_tokens: 100,
    });

    spinner.stop();

    return (
      response.choices[0]?.message?.content?.trim() ?? 'chore: updated code lol'
    );
  } catch (error) {
    spinner.stop();
    if (error instanceof Error) {
      console.error(chalk.red('Error:', error.message));
    } else {
      console.error(chalk.red('An unknown error occurred'));
    }
    process.exit(1);
  }
}

/**
 * Performs the git commit with the given message
 * @param {string} message - The commit message
 * @throws {GitError} If the commit fails
 */
async function performCommit(message: string): Promise<void> {
  try {
    await execPromise('git commit -m "' + message.replace(/"/g, '\\"') + '"');
    console.log(chalk.green('✔ Success!'));
  } catch (error) {
    const gitError = error as GitError;
    if (gitError.stderr) {
      console.error(chalk.red('Git Error:', gitError.stderr));
    } else {
      console.error(chalk.red('Error committing changes:', gitError.message));
    }
    process.exit(1);
  }
}

/**
 * Prompts for a single keypress response
 * @param {string} prompt - The prompt to display
 * @returns {Promise<KeyResponse>} The user's response (c/e/q)
 */
async function promptForKey(prompt: string): Promise<KeyResponse> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key: string) => {
      if (key === '\u0003' || key === '\u0004') {
        process.stdout.write('\n');
        process.exit();
      }

      const normalizedKey = key.toLowerCase() as KeyResponse;
      if (['c', 'e', 'q'].includes(normalizedKey)) {
        process.stdout.write(key + '\n');
        process.stdin.removeListener('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(normalizedKey);
      }
    };

    process.stdin.on('data', onData);
  });
}

/**
 * Prompts for a multi-line message input
 * @param {string} prompt - The prompt to display
 * @returns {Promise<string>} The user's input
 */
async function promptForMessage(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Quick commit action that automatically generates and applies a commit message
 * @param {CommandOptions} options - Command line options
 */
const quickCommitAction = async (options: CommandOptions): Promise<void> => {
  await ensureConfig();

  try {
    const diff = await getDiff();

    if (!diff) {
      console.log(chalk.yellow('No changes detected in the repository.'));
      return;
    }

    const commitMessage = await generateCommitMessage(diff);
    console.log('Generated commit:');
    console.log(chalk.green(commitMessage));

    await performCommit(commitMessage);
  } catch (error) {
    console.error(chalk.red('Error:', error));
    process.exit(1);
  }
};

/**
 * Interactive commit action that allows reviewing and editing the commit message
 * @param {CommandOptions} options - Command line options
 */
const generateAction = async (options: CommandOptions): Promise<void> => {
  await ensureConfig();

  try {
    const diff = await getDiff();

    if (!diff) {
      console.log(chalk.yellow('No changes detected in the repository.'));
      return;
    }

    const commitMessage = await generateCommitMessage(diff);
    console.log('Generated commit:');
    console.log(chalk.green(commitMessage));

    const answer = await promptForKey(
      chalk.bold('Press (c) to commit, (e) to edit, or (q) to quit: ')
    );

    if (answer === 'c') {
      await performCommit(commitMessage);
    } else if (answer === 'e') {
      const editedMessage = await promptForMessage(
        chalk.bold('\nEnter your modified commit message:\n> ')
      );
      if (editedMessage.trim()) {
        await performCommit(editedMessage);
      } else {
        console.log(chalk.yellow('Commit cancelled - empty message'));
      }
    } else {
      console.log(chalk.yellow('Commit cancelled'));
    }
  } catch (error) {
    console.error(chalk.red('Error:', error));
    process.exit(1);
  }
};

// CLI setup
const program = new Command();

program
  .name('gpt-auto-commit')
  .description('Generate commit messages using ChatGPT')
  .version(packageJson.version);

program
  .command('config')
  .description('Configure the CLI tool')
  .option('-k, --key <key>', 'Set OpenAI API key')
  .option(
    '-m, --model <model>',
    'Set OpenAI model (e.g., gpt-5-mini, gpt-5-nano, gpt-4o-mini, etc)'
  )
  .action(async (options: CommandOptions) => {
    await ensureConfig();
    if (options.key) {
      await setApiKey(options.key);
    }
    if (options.model) {
      await setModel(options.model);
    }
    if (!options.key && !options.model) {
      const config = await getConfig();
      console.log('Current configuration:');
      console.log('API Key:', config.apiKey ? '********' : 'Not set');
      console.log('Model:', config.model);
    }
  });

program
  .command('generate')
  .description('Generate commit message with interactive options to review')
  .action(generateAction);

program
  .description('Quickly generate message and commit automatically')
  .action(quickCommitAction);

program.parse();
