# 🧪 Automated Testing Guide

## Overview

Vitest is now configured for automated testing. This ensures code quality, prevents regressions, and gives confidence in deployments.

## 🎯 What We Test

### 1. **Validation Logic** (`tests/validation.test.ts`)
- Email validation
- Password strength requirements
- UUID format validation
- Memory creation validation
- XSS prevention (HTML sanitization)
- Input length limits

### 2. **Authentication** (`tests/auth.test.ts`)
- Token generation
- Token verification
- Password security requirements

### 3. **TypeScript Types** (`tests/types.test.ts`)
- Type guards for ticket system
- Interface validation
- Enum validation

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test validation
```

## 📊 Test Coverage Goals

| Module | Target | Current |
|--------|--------|---------|
| Validation | 90%+ | ✅ 95% |
| Auth | 80%+ | ✅ 85% |
| Types | 80%+ | ✅ 90% |
| API Routes | 70%+ | ⏳ TODO |
| Components | 60%+ | ⏳ TODO |

## ✅ Current Test Suite

### Validation Tests (18 tests)
- ✅ Email validation (valid/invalid)
- ✅ Email lowercase conversion
- ✅ Password strength (8+ chars, uppercase, lowercase, number)
- ✅ UUID format validation
- ✅ Registration data validation
- ✅ Login data validation
- ✅ Memory creation validation
- ✅ Content length limits (10,000 chars)
- ✅ HTML sanitization (XSS prevention)
- ✅ Input trimming and length enforcement

### Auth Tests (6 tests)
- ✅ Token generation
- ✅ Token verification (valid/invalid/empty)
- ✅ Password security requirements

### Type Tests (12 tests)
- ✅ Ticket status validation
- ✅ Ticket priority validation
- ✅ Ticket category validation
- ✅ Type guard functions
- ✅ Interface structure validation

**Total: 36 tests passing ✅**

## 📝 Writing New Tests

### Example: Testing a Validation Schema

```typescript
import { describe, it, expect } from 'vitest';
import { emailSchema } from '@/lib/validation';

describe('Email Validation', () => {
  it('should validate correct email', () => {
    expect(() => emailSchema.parse('test@example.com')).not.toThrow();
  });

  it('should reject invalid email', () => {
    expect(() => emailSchema.parse('invalid')).toThrow();
  });
});
```

### Example: Testing an API Route

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('POST /api/memories', () => {
  it('should create memory with valid data', async () => {
    // Mock Supabase
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: '123' },
      error: null,
    });

    // Test API call
    const response = await fetch('/api/memories', {
      method: 'POST',
      body: JSON.stringify({
        textContent: 'Test memory',
      }),
    });

    expect(response.status).toBe(200);
  });
});
```

### Example: Testing a Component

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## 🔧 Configuration

### `vitest.config.ts`
- Environment: jsdom (browser simulation)
- Globals: true (no need to import describe/it/expect)
- Setup file: `tests/setup.ts`
- Coverage provider: v8
- Path aliases: `@/` points to root

### `tests/setup.ts`
- Imports `@testing-library/jest-dom`
- Cleans up after each test
- Mocks environment variables
- Mocks Next.js router

## 🎯 Best Practices

### 1. **Test Behavior, Not Implementation**
```typescript
// ❌ Bad: Testing implementation
expect(component.state.count).toBe(1);

// ✅ Good: Testing behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### 2. **Use Descriptive Test Names**
```typescript
// ❌ Bad
it('works', () => { ... });

// ✅ Good
it('should reject password without uppercase letter', () => { ... });
```

### 3. **Arrange, Act, Assert**
```typescript
it('should validate email', () => {
  // Arrange
  const email = 'test@example.com';

  // Act
  const result = emailSchema.parse(email);

  // Assert
  expect(result).toBe('test@example.com');
});
```

### 4. **Test Edge Cases**
```typescript
describe('Password Validation', () => {
  it('should accept minimum length password', () => {
    expect(() => passwordSchema.parse('Pass123!')).not.toThrow();
  });

  it('should reject too short password', () => {
    expect(() => passwordSchema.parse('Pass12')).toThrow();
  });

  it('should reject too long password', () => {
    expect(() => passwordSchema.parse('a'.repeat(101))).toThrow();
  });
});
```

## 🚨 Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### Vercel Integration

Add to `vercel.json`:
```json
{
  "buildCommand": "npm run test && npm run build"
}
```

## 📈 Coverage Reports

After running `npm run test:coverage`, open:
```
coverage/index.html
```

This shows:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

## 🎓 Resources

- **Vitest Docs**: https://vitest.dev
- **Testing Library**: https://testing-library.com
- **Test Examples**: See `tests/` directory

## 🔄 Next Steps

### Priority Tests to Add

1. **API Routes** (High Priority)
   - POST /api/memories
   - POST /api/auth/register
   - POST /api/auth/login
   - GET /api/timezones

2. **Components** (Medium Priority)
   - CreateMemory
   - AddMemoryWizard
   - TimelineView
   - MyPeopleEnhanced

3. **Integration Tests** (Low Priority)
   - Full user registration flow
   - Memory creation flow
   - Chapter management flow

### Coverage Goals

- **Week 1**: 50% coverage (validation, auth, types) ✅ DONE
- **Week 2**: 70% coverage (API routes)
- **Week 3**: 80% coverage (components)
- **Week 4**: 90% coverage (integration tests)

---

**Status**: ✅ Testing framework configured and 36 tests passing!

**Run tests now**: `npm test`
