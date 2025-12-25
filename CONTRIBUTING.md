# Contributing to NullStack

Thank you for your interest in contributing to NullStack! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Docker and Docker Compose
- Git
- A code editor (VS Code recommended)

### Setup Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/nullstack.git
cd nullstack
```

3. Add the upstream repository:
```bash
git remote add upstream https://github.com/original-org/nullstack.git
```

4. Run the setup script:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

5. Create a branch for your changes:
```bash
git checkout -b feature/your-feature-name
```

## Development Workflow

### Project Structure

- `apps/` - Frontend applications (Developer Portal)
- `services/` - Backend microservices
- `packages/` - Shared packages and utilities
- `kubernetes/` - Kubernetes deployment manifests
- `scripts/` - Automation scripts
- `docs/` - Documentation

### Making Changes

1. Make sure you're up to date with upstream:
```bash
git fetch upstream
git merge upstream/main
```

2. Make your changes in your feature branch

3. Test your changes:
```bash
npm run test
npm run lint
```

4. Build the project:
```bash
npm run build
```

5. Commit your changes (see [Commit Guidelines](#commit-guidelines))

6. Push to your fork:
```bash
git push origin feature/your-feature-name
```

7. Create a Pull Request

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Use enums for constants

### Code Style

We use ESLint and Prettier for code formatting. Run before committing:

```bash
npm run lint
npm run format
```

### Naming Conventions

- **Files**: Use kebab-case (e.g., `player-service.ts`)
- **Directories**: Use kebab-case (e.g., `auth-service/`)
- **Classes**: Use PascalCase (e.g., `PlayerService`)
- **Functions/Variables**: Use camelCase (e.g., `getUserData`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Interfaces**: Use PascalCase with descriptive names (e.g., `PlayerData`, `AuthResponse`)

### Best Practices

#### General

- Write self-documenting code with clear variable names
- Keep functions small and focused (single responsibility)
- Avoid deep nesting - prefer early returns
- Handle errors appropriately
- Add comments for complex logic
- Don't commit commented-out code

#### API Design

- Use RESTful conventions
- Use proper HTTP status codes
- Validate all inputs
- Return consistent response formats
- Include proper error messages

#### Security

- Never commit secrets or credentials
- Validate and sanitize all inputs
- Use parameterized queries for database operations
- Implement rate limiting
- Follow the principle of least privilege

#### Performance

- Use async/await for asynchronous operations
- Implement caching where appropriate
- Optimize database queries
- Use connection pooling
- Profile before optimizing

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `ci`: CI/CD changes

### Examples

```
feat(auth): add password reset functionality

Implement password reset flow with email verification.
Includes new endpoints and email templates.

Closes #123
```

```
fix(player): resolve data sync issue

Fix race condition in player data synchronization
that caused occasional data loss.

Fixes #456
```

```
docs(api): update authentication documentation

Add examples for OAuth flow and improve clarity
of JWT token usage.
```

### Scope

The scope should indicate which service or package is affected:
- `auth` - Auth service
- `player` - Player service
- `economy` - Economy service
- `api-gateway` - API Gateway
- `analytics` - Analytics service
- `cloudscript` - CloudScript service
- `matchmaking` - Matchmaking service
- `portal` - Developer Portal
- `shared` - Shared packages
- `database` - Database package
- `ci` - CI/CD
- `docs` - Documentation

## Pull Request Process

### Before Submitting

- [ ] Update documentation if needed
- [ ] Add tests for new functionality
- [ ] Ensure all tests pass
- [ ] Run linter and fix any issues
- [ ] Update CHANGELOG.md if applicable
- [ ] Rebase on latest main branch

### PR Title

Use the same format as commit messages:
```
feat(auth): add OAuth provider support
```

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] All tests pass locally
- [ ] Any dependent changes have been merged

## Related Issues
Closes #(issue number)
```

### Review Process

1. At least one maintainer must approve the PR
2. All CI checks must pass
3. No merge conflicts with main branch
4. Code review feedback must be addressed

### After Approval

Maintainers will merge your PR using "Squash and Merge" to keep the commit history clean.

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific service
npm run test --workspace=@nullstack/auth-service

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for all new functions
- Write integration tests for API endpoints
- Aim for at least 80% code coverage
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)

### Test Structure

```typescript
describe('PlayerService', () => {
  describe('createPlayer', () => {
    it('should create a new player with valid data', async () => {
      // Arrange
      const playerData = { name: 'TestPlayer' };

      // Act
      const result = await playerService.createPlayer(playerData);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('TestPlayer');
    });

    it('should throw error with invalid data', async () => {
      // Arrange
      const invalidData = {};

      // Act & Assert
      await expect(playerService.createPlayer(invalidData))
        .rejects.toThrow('Invalid player data');
    });
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments for all public functions
- Document complex algorithms
- Include usage examples for utility functions

```typescript
/**
 * Calculates the player's level based on experience points
 * @param xp - The player's total experience points
 * @returns The calculated level (minimum 1)
 * @example
 * ```typescript
 * const level = calculateLevel(1000); // returns 5
 * ```
 */
function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}
```

### API Documentation

- Update Swagger/OpenAPI specs for API changes
- Include request/response examples
- Document error responses

### User Documentation

- Update relevant docs in `docs/` directory
- Keep README.md up to date
- Add examples for new features

## Questions?

If you have questions:
- Check existing documentation
- Search existing issues
- Open a new issue with the `question` label
- Join our discussions on GitHub

## License

By contributing to NullStack, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to NullStack!
