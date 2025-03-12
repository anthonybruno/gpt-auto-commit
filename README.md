# ✌️ GPT Auto Commit

![GPT Auto Commit Screenshot](https://abruno.net/gpc-screenshot.png)

A cute little CLI tool that uses OpenAI's GPT-4 to ✨automatically✨ generate commit messages.

## ✨ Features

- One command, instant commit messages
- Edit a message in interactive mode
- Only checks staged changes
- Follows [Conventional Commits](https://www.conventionalcommits.org) to make you look good
- Clean, colorful CLI for smooth workflow
- Progress bars so you're never left hanging

## 📦 Installation

```bash
npm install -g gpt-auto-commit
```

## 🔑 API Key & Pricing

This tool requires an OpenAI API key to function. Here's what you need to know:

- Sign up for an [OpenAI account](https://platform.openai.com/signup)
- Create a [new API key](https://platform.openai.com/api-keys)

Also just a heads up that this _does_ cost money:

- [gpt-4o-mini pricing](https://openai.com/pricing)
- [Monitor your usage](https://platform.openai.com/usage)

## 🛠️ Setup

Before using the tool, you gotta configure your OpenAI API key:

```bash
gpt-auto-commit config --key YOUR_OPENAI_API_KEY
# or use the shorthand
gpc config --key YOUR_OPENAI_API_KEY
```

## 🚀 Usage

### Quick Commit (Recommended)

Run `gpc` in your git repository to automatically generate and commit your changes:

```bash
gpc
```

This will:

1. Analyze your staged changes
2. Generate a commit message
3. Automatically commit with the generated message

### Interactive Mode

If you want to review or edit the commit message before committing:

```bash
gpc generate
```

This will:

1. Generate a commit message
2. Give you options to:
   - Press `c` to commit as is
   - Press `e` to edit the message
   - Press `q` to quit without committing

## 📝 Commands

All commands can be used with either `gpt-auto-commit` or the shorthand `gpc`:

- `gpc` - Quick generate and commit (default)
- `gpc generate` - Interactive mode with edit options
- `gpc config --key <key>` - Set your OpenAI API key
- `gpc --help` - Show help information
