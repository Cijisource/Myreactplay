# Contributing to eCommerce App

First off, thanks for considering contributing to our eCommerce application! It's people like you that make this application such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, check the issues list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps which reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs if possible**
- **List your environment information**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and the expected behavior**
- **Explain why this enhancement would be useful**

### Pull Requests

- Fill in the required template
- Follow the JavaScript/TypeScript styleguides
- End all files with a newline
- Avoid platform-dependent code
- Place `require` statements at the top of files

## Development Setup

1. Fork and clone the repository
```bash
git clone https://github.com/your-username/ecommerce.git
cd ecommerce
```

2. Install dependencies
```bash
npm run install-all
```

3. Create a feature branch
```bash
git checkout -b feature/your-feature-name
```

4. Make your changes and test thoroughly
```bash
npm run dev
```

5. Commit with clear messages
```bash
git commit -am 'Add some feature'
```

6. Push to your fork
```bash
git push origin feature/your-feature-name
```

7. Create a Pull Request

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### JavaScript/TypeScript Styleguide

- Use trailing commas in multi-line structures
- Use single quotes for strings
- Prefer `const` over `let`
- No `var` declarations

### Component Styleguide

- Use functional components with hooks
- One component per file
- Use descriptive prop names
- Add PropTypes or TypeScript interfaces

### Commit Format
```
feat: Add user authentication
fix: Resolve cart item duplication bug
docs: Update deployment guide
style: Format code according to eslint rules
refactor: Reorganize database connection logic
test: Add tests for product filtering
```

## Additional Notes

### Issue and Pull Request Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested

## Community

- Join our discussions for questions and ideas
- Check existing issues before asking
- Be respectful and constructive

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Questions?

Feel free to contact the maintainers or open an issue for any clarification!

Thank you for contributing! 🎉
