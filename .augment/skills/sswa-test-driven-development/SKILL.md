---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code — and specifically during /sswa:propose, where the failing tests (RED) are written as artifacts of the change. Write the test first, watch it fail, write the minimum code to pass.
---

# Test-Driven Development (TDD)

Write the test first. Watch it fail. Write just enough code to pass.

**Core principle:** "If you didn't watch the test fail, you don't know if it tests the
right thing."

**Key insight:** Following the letter while ignoring the spirit defeats the purpose.

## How this fits the SSWA flow

In SSWA, the RED phase happens at **propose** time, not apply time. `/sswa:propose` turns
each `#### Scenario:` in the change's delta specs into a failing test, runs the suite to
confirm it fails for the right reason, and commits those tests as artifacts of the change
(under `openspec/changes/<name>/tests/` and/or the project's test dir). The agreed spec and
its proof-of-absence (failing tests) are the contract — *so say we all*.

`/sswa:apply` then runs GREEN: write the minimum implementation to turn each failing test
green, one at a time, refactoring as you go. `/sswa:verify` confirms the whole suite is
green before the PR.

## When to Use

**Always apply to:** new features, bug fixes, refactoring, behavior changes.

**Possible exceptions (consult the team):** throwaway prototypes, generated code, config.

Tempted to skip just this once? That's self-justification talking.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Already wrote the implementation? Delete it and start from the test. Don't keep it "as
reference", don't "integrate it while testing" — full deletion only.

## Red-Green-Refactor

### RED — write a failing test

One minimal test that demonstrates the expected behavior.

```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };
  const result = await retryOperation(operation);
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

Descriptive name, real behavior, one concern. Avoid tests that only assert on a mock.

**Test requirements:** one behavior per test; descriptive name; exercise real code
(minimize mocks).

### Verify RED — confirm it fails

**Essential. Do not skip.**

```bash
npm test path/to/test.test.ts
```

Confirm: the test *fails* (not errors), the failure message is the expected one, and it
fails because the capability is missing (not a syntax/typo error).

- Test passes already? You're describing existing behavior — revise the test.
- Test throws? Fix the error and repeat until you get a clean assertion failure.

### GREEN — minimum implementation

Write the simplest code that makes the test pass. No extra options, no speculative
features, no unrelated refactoring.

### Verify GREEN — confirm it passes

```bash
npm test path/to/test.test.ts
```

Confirm: the test passes, other tests still pass, output is clean. If it fails, fix the
*implementation*, not the test. If you broke other tests, fix them now.

### REFACTOR — improve quality

With tests green: remove duplication, clarify names, extract helpers. Keep tests green; add
no new behavior.

### Repeat

Move to the next failing test for the next slice of behavior.

## Test quality

| Aspect | Effective | Ineffective |
|--------|-----------|-------------|
| Simplicity | One concern. Multiple "and"s → split. | `test('validates email and domain and whitespace')` |
| Naming | Behavior described clearly | `test('test1')` |
| Clarity | Reveals intended API usage | Obscures the requirement |

## Why test-first (not test-after)

Tests written after the code pass immediately and prove nothing — they validate what you
built, not what was required, and never witnessed catching a real bug. Writing the test
first forces you to watch it fail, which is the only proof it actually tests the behavior.
"I already tested it manually" is unsystematic, undocumented, and not repeatable.

## Stop signs — delete and restart

Implementation before test; tests written after; a test that passes before any
implementation; can't explain why the test failed; "I'll add tests later"; "just this
once"; "keep it as reference". **Every one means: delete the code, restart with TDD.**

## Completion checklist

- [ ] Each new function/method has a corresponding test.
- [ ] You watched each test fail before implementing it.
- [ ] Each failure was a missing capability (not a typo/syntax error).
- [ ] Minimal code written to pass each test.
- [ ] All tests pass; no errors or warnings.
- [ ] Tests exercise real code (mocks only where essential).
- [ ] Edge cases and error paths covered.

Missing a box? TDD wasn't followed — begin fresh.

## Bug fixes

Found a bug? Write a failing test that reproduces it first, then fix. The test proves the
repair and guards against regression. Never fix a bug without an accompanying test.

---

_Adapted from obra/superpowers `test-driven-development`._
