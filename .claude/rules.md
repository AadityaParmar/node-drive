# Project Rules for node-drive

## Token Conservation Guidelines

**IMPORTANT: This project prioritizes token efficiency. Follow these rules strictly:**

### Prohibited Automatic Actions

1. **NO automatic test generation** - Never write tests unless explicitly requested by the user
2. **NO automatic build verification** - Do not run build commands to verify changes unless explicitly requested
3. **NO automatic test running** - Do not run test suites automatically after changes
4. **NO automatic linting/formatting** - Do not run linters or formatters unless requested
5. **NO automatic dependency checks** - Do not check for outdated packages or vulnerabilities automatically
6. **NO automatic code reviews** - Do not use review agents or perform comprehensive code reviews unless requested

### Required Behavior

- **Always ASK before** running builds, tests, or other verification steps
- **Always SUGGEST** optional tasks (like "Would you like me to run the tests?" or "Should I verify the build?")
- **Trust the implementation** - Assume code changes work unless the user asks for verification
- **Minimize exploration** - Only search/read files that are directly necessary for the task
- **Avoid redundant reads** - Don't re-read files you've already seen unless needed

### What IS Allowed

- Direct implementation of requested features
- Reading files necessary to complete a specific task
- Making code changes as requested
- Answering questions about the codebase
- Running specific commands when explicitly requested

### Project Context

This is a monorepo with:
- **Client**: Node.js client application (client/)
- **Server**: Express server application (server/)

Only explore or modify code that is directly relevant to the user's specific request.
