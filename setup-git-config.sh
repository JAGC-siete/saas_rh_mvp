#!/bin/bash

# Script to set up git configuration with DevOps best practices

echo "Setting up git configuration with DevOps best practices..."

# Set commit template
git config --local commit.template .gitmessage
echo "✅ Commit template configured"

# Configure line endings
git config --local core.autocrlf input
echo "✅ Line endings configured"

# Set pull strategy to rebase
git config --local pull.rebase true
echo "✅ Pull strategy set to rebase"

# Set push default behavior
git config --local push.default current
echo "✅ Push default behavior configured"

# Add pre-commit hook if not already added
if [ ! -x .git/hooks/pre-commit ]; then
  cp .git/hooks/pre-commit .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  echo "✅ Pre-commit hook installed"
else
  echo "✅ Pre-commit hook already installed"
fi

# Set up branch protection aliases
git config --local alias.protected-branch "!f() { \
  if [ \"\$1\" = \"--list\" ]; then \
    git config --get-regexp 'branch\\.[^.]*\\.protected' | sed 's/branch.\\([^.]*\\).protected.*/\\1/'; \
  elif [ -n \"\$1\" ]; then \
    git config --local branch.\$1.protected true; \
    echo \"Branch \$1 is now protected\"; \
  else \
    echo \"Usage: git protected-branch <branch-name> OR git protected-branch --list\"; \
  fi; }; f"
echo "✅ Protected branch alias configured"

# Set up better log aliases
git config --local alias.lg "log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) - %C(bold green)(%ar)%C(reset) %C(white)%s%C(reset) %C(dim white)- %an%C(reset)%C(bold yellow)%d%C(reset)' --all"
git config --local alias.lg2 "log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) - %C(bold cyan)%aD%C(reset) %C(bold green)(%ar)%C(reset)%C(bold yellow)%d%C(reset)%n''          %C(white)%s%C(reset) %C(dim white)- %an%C(reset)' --all"
echo "✅ Log aliases configured"

# Protect main and develop branches
git config --local branch.main.protected true
git config --local branch.develop.protected true
echo "✅ Main and develop branches protected"

# Set up default branches to protect
for branch in main develop master release/v0.1-mvp; do
  if git show-ref --verify --quiet refs/heads/$branch; then
    git config --local branch.$branch.protected true
    echo "✅ Protected branch: $branch"
  fi
done

echo ""
echo "Git configuration complete! 🚀"
echo ""
echo "Protected branches:"
git protected-branch --list
echo ""
echo "Try these useful git commands:"
echo "- git lg                  # Better log view"
echo "- git protected-branch    # Manage protected branches"
echo ""
