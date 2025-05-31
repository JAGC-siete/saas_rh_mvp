# Git Workflow

This document outlines the Git workflow for the Humano SISU project.

## Branching Strategy

We follow a modified GitFlow workflow with the following branches:

### Main Branches

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features

### Supporting Branches

- **`feature/*`**: For new features
- **`release/*`**: For releases
- **`hotfix/*`**: For critical fixes

## Feature Development

For feature development:

1. **Create a feature branch from `develop`**:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/module/description
   ```

2. **Make commits using conventional commit messages**:
   ```bash
   git commit -m "feat: add login functionality"
   git commit -m "fix: resolve input validation issue"
   ```

3. **Push your branch to the remote repository**:
   ```bash
   git push -u origin feature/module/description
   ```

4. **Create a pull request to `develop`**:
   - Ensure tests pass
   - Get code review
   - Address feedback

5. **Squash and merge**:
   - When approved, squash and merge to `develop`
   - Use a structured commit message

## Release Process

For creating a release:

1. **Create a release branch from `develop`**:
   ```bash
   git checkout develop
   git pull
   git checkout -b release/v1.2.0
   ```

2. **Make any release-specific changes**:
   - Version bumps
   - Documentation updates
   - Final fixes

3. **Push the release branch**:
   ```bash
   git push -u origin release/v1.2.0
   ```

4. **Create a pull request to `main`**:
   - Get approval from required reviewers
   - Ensure all tests pass
   - Verify staging deployment works

5. **After merging to `main`, merge back to `develop`**:
   ```bash
   git checkout develop
   git merge --no-ff main
   git push
   ```

6. **Create a version tag**:
   ```bash
   git checkout main
   git pull
   git tag -a v1.2.0 -m "Version 1.2.0"
   git push --tags
   ```

## Hotfix Process

For critical fixes:

1. **Create a hotfix branch from `main`**:
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/description
   ```

2. **Make the fix**:
   ```bash
   git commit -m "fix: resolve critical security issue"
   ```

3. **Push the hotfix branch**:
   ```bash
   git push -u origin hotfix/description
   ```

4. **Create pull requests to `main` and `develop`**:
   - Get approvals
   - Merge to `main` first
   - Then merge to `develop`

5. **Create a version tag**:
   ```bash
   git checkout main
   git pull
   git tag -a v1.2.1 -m "Hotfix v1.2.1"
   git push --tags
   ```

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
<type>: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting changes
- `refactor`: Code refactoring
- `test`: Adding/refactoring tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes
- `security`: Security-related changes

## Code Review Guidelines

When reviewing code:

1. **Functionality**: Does the code work as expected?
2. **Security**: Are there any security concerns?
3. **Performance**: Are there any performance issues?
4. **Maintainability**: Is the code easy to maintain?
5. **Testing**: Are there appropriate tests?
6. **Documentation**: Is the code well-documented?

## Git Hooks

We use Git hooks to enforce standards:

- **pre-commit**: Runs linting and format checks
- **commit-msg**: Validates commit message format
- **pre-push**: Runs tests

## Best Practices

- Keep commits focused and atomic
- Write clear, descriptive commit messages
- Rebase feature branches regularly to keep up with `develop`
- Never force push to `main` or `develop`
- Delete branches after merging
- Use pull requests for all changes
- Tag all releases with semantic versioning
