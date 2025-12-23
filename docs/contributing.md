# Contributing Guide

Thank you for your interest in contributing to The Lily Pad! This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the issue, not the person
- Help others learn and grow

## Getting Started

### 1. Fork the Repository

1. Go to the GitHub repository
2. Click "Fork" to create your own copy
3. Clone your fork locally

```bash
git clone https://github.com/YOUR_USERNAME/the-lily-pad.git
cd the-lily-pad
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code patterns
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic

### TypeScript

```typescript
// ✅ Good
interface UserProps {
  name: string;
  email: string;
}

const User: React.FC<UserProps> = ({ name, email }) => {
  return <div>{name} - {email}</div>;
};

// ❌ Bad
const User = (props: any) => {
  return <div>{props.name}</div>;
};
```

### React Components

```typescript
// ✅ Good - Small, focused component
const WalletBalance: React.FC<{ balance: string }> = ({ balance }) => (
  <div className="text-lg font-bold">
    {parseFloat(balance).toFixed(4)} MON
  </div>
);

// ✅ Good - Hooks at top, clear structure
const MintCard: React.FC = () => {
  const { balance, isConnected } = useWallet();
  const [amount, setAmount] = useState(1);
  
  const handleMint = useCallback(async () => {
    // Implementation
  }, [amount]);
  
  return (
    <Card>
      {/* Component JSX */}
    </Card>
  );
};
```

### Styling

Use Tailwind CSS with design system tokens:

```tsx
// ✅ Good - Using design system
<div className="bg-background text-foreground border-border">
  <Button variant="primary">Click me</Button>
</div>

// ❌ Bad - Hardcoded colors
<div className="bg-white text-black border-gray-200">
  <button className="bg-blue-500">Click me</button>
</div>
```

### File Organization

```
src/
├── components/
│   ├── ComponentName/
│   │   ├── index.tsx        # Main component
│   │   ├── ComponentName.tsx
│   │   └── ComponentName.test.tsx
│   └── ui/                  # Reusable UI components
├── hooks/
│   └── useCustomHook.ts
├── pages/
│   └── PageName.tsx
└── lib/
    └── utils.ts
```

## Making Changes

### 1. Write Code

Follow the guidelines above and make your changes.

### 2. Test Your Changes

```bash
# Run type check
npm run typecheck

# Run linter
npm run lint

# Test in browser
npm run dev
```

### 3. Commit Your Changes

Use conventional commit messages:

```bash
# Features
git commit -m "feat: add network switch component"

# Bug fixes
git commit -m "fix: resolve wallet connection issue"

# Documentation
git commit -m "docs: update installation guide"

# Refactoring
git commit -m "refactor: simplify mint logic"

# Styles
git commit -m "style: improve button hover states"
```

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Pull Request Guidelines

### PR Title

Use the same format as commit messages:

```
feat: add gas estimation display
fix: handle network switch edge case
docs: add API reference
```

### PR Description

Include:
- What changes were made
- Why the changes were needed
- Screenshots (if UI changes)
- Testing steps

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Screenshots
(if applicable)

## Testing
- [ ] Tested locally
- [ ] Added tests
- [ ] All tests pass

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed my code
- [ ] Added comments where needed
- [ ] Updated documentation
```

## Reporting Issues

### Bug Reports

Include:
1. Clear title
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Screenshots/console logs
6. Environment (browser, OS)

### Feature Requests

Include:
1. Clear title
2. Problem description
3. Proposed solution
4. Alternatives considered
5. Additional context

## Areas for Contribution

### Good First Issues

- Documentation improvements
- Typo fixes
- Simple UI tweaks
- Test coverage

### Intermediate

- New components
- Bug fixes
- Performance improvements
- Accessibility enhancements

### Advanced

- Core feature development
- Architecture changes
- Security improvements
- Web3 integration

## Questions?

- Open a GitHub issue
- Join our Discord
- Email: dev@lilypad.xyz

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to The Lily Pad! 🐸
