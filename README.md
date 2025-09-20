# GPT Auto Commit

![GPT Auto Commit Screenshot](https://github.com/user-attachments/assets/919558a7-cc4e-4e47-804b-0be0e14cd722)

GPT Auto Commit is a lightweight CLI tool that uses OpenAI’s GPT models to automatically generate clear, standards-compliant commit messages.

## Why

Commit messages are the foundation of maintainable software. They drive changelogs, guide future debugging, and communicate intent across teams. Yet, writing them is often inconsistent, rushed, or forgotten entirely.

GPT Auto Commit helps developers maintain quality without adding friction. By analyzing staged changes and generating conventional commit messages, it enforces consistency while saving time so teams can focus on shipping code instead of debating message formats.

## Features

- Generate commit messages with a single command
- Interactive mode to review or edit messages before committing
- Works only on staged changes for precision
- Follows [Conventional Commits](https://www.conventionalcommits.org) for consistent versioning and changelogs
- Clean, colorful CLI interface for a smooth developer experience
- Built-in progress indicators for responsive feedback

## Installation

```bash
npm install -g gpt-auto-commit
```

## API Key & Pricing

GPT Auto Commit requires an OpenAI API key.

- Sign up for an [OpenAI account](https://platform.openai.com/signup)
- Create a [new API key](https://platform.openai.com/api-keys)

**Note:** Usage costs depend on the model you select.

- [gpt-4o-mini pricing](https://platform.openai.com/docs/pricing)
- [Monitor your usage](https://platform.openai.com/usage)

## Setup

Configure your API key before first use:

```bash
gpt-auto-commit config --key YOUR_OPENAI_API_KEY
# or use the shorthand
gpc config --key YOUR_OPENAI_API_KEY
```

### Model Configuration

The default model is `gpt-4o-mini` for cost efficiency, but you can configure others:

```bash
# Set a different model
gpc config --model gpt-4o
gpc config --model gpt-3.5-turbo

# Set both API key and model at once
gpc config --key YOUR_API_KEY --model gpt-4o

# View current configuration
gpc config
```

See the full [list of available models](https://platform.openai.com/docs/pricing).

## Usage

### Quick Commit (Recommended)

Automatically generate and commit with one command:

```bash
gpc
```

Process:

1. Analyze staged changes
2. Generate a commit message
3. Commit with the generated message

### Interactive Mode

Review or edit before committing:

```bash
gpc generate
```

Options:

- `c` to commit as generated
- `e` to edit the message
- `q` to quit without committing

## Commands

All commands are available via `gpt-auto-commit` or shorthand `gpc`:

- `gpc` - Quick generate and commit
- `gpc generate` - Interactive mode with edit options
- `gpc config --key <key>` - Set your OpenAI API key
- `gpc config --model <model>` - Set your OpenAI model
- `gpc config` - View current configuration
- `gpc --help` - Show help information
