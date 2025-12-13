# Contributing to mcp-cloudron

Thank you for your interest in contributing to the Cloudron MCP server!

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Access to a Cloudron instance (for integration testing)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/serenichron/mcp-cloudron.git
   cd mcp-cloudron
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Cloudron credentials
   ```

4. Build and test:
   ```bash
   npm run build
   npm test
   ```

## Making Changes

### Code Style

- TypeScript with strict mode enabled
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Follow existing code patterns

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Write/update tests as needed
5. Ensure all tests pass: `npm test`
6. Commit with clear messages: `git commit -m "feat: add new capability"`
7. Push and open a Pull Request

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

## Adding New Tools

To add a new MCP tool:

1. Add the endpoint to `src/cloudron-client.ts`
2. Add types to `src/types.ts`
3. Register the tool in `src/server.ts`
4. Add tests
5. Update README documentation

## Reporting Issues

### Bug Reports

Please include:
- Cloudron version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

### Feature Requests

Please describe:
- The use case
- Expected behavior
- Why it would be valuable

## Security

If you discover a security vulnerability, please email vlad@serenichron.com instead of opening a public issue.

## Questions?

Open a [GitHub Discussion](https://github.com/serenichron/mcp-cloudron/discussions) or ask on the [Cloudron Forum](https://forum.cloudron.io).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
