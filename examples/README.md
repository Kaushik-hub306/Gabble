# Gabble Examples

Before/after comparisons showing the combined impact of lazy development
and token optimization.

## Example 1: API response caching

**Before (over-engineered):**
```python
class CacheManager:
    def __init__(self, backend='redis', ttl=300):
        self.backend = Redis() if backend == 'redis' else InMemoryCache()
        self.ttl = ttl
    def get(self, key): ...
    def set(self, key, value): ...
    def invalidate(self, key): ...

cache = CacheManager()
@cache.cached('user_api')
def fetch_users():
    return requests.get('/api/users').json()
```
_~25 lines, 1 new dependency (redis-py), ~800 tokens to read._

**After (gabble full):**
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def fetch_users():
    return requests.get('/api/users').json()
```
_~4 lines, 0 new deps, ~120 tokens to read._

→ Skipped: custom CacheManager, Redis backend. Add when lru_cache measurably falls short.

## Example 2: Directory listing

**Before (raw):**
```
$ ls -la
total 456
drwxr-xr-x  12 user  staff    384 Jun 27 10:00 .
drwxr-xr-x   8 user  staff    256 Jun 27 09:00 ..
-rw-r--r--   1 user  staff   2048 Jun 27 09:30 .env
-rw-r--r--   1 user  staff    512 Jun 27 09:30 .gitignore
-rw-r--r--   1 user  staff   4096 Jun 27 09:30 README.md
drwxr-xr-x   5 user  staff    160 Jun 27 09:30 src
... (45 lines, ~800 tokens)
```

**After (gabble ls):**
```
6 files, 4 dirs, 2 hidden
```
_1 line, ~10 tokens. -79% tokens._

## Example 3: Test output

**Before (raw pytest):**
```
$ pytest
============================= test session starts ==============================
platform darwin -- Python 3.12.0, pytest-8.0.0, pluggy-1.4.0
rootdir: /Users/kaushik/project
configfile: pyproject.toml
plugins: cov-4.1.0, mock-3.12.0
collected 247 items

tests/test_auth.py ....................                                  [  8%]
tests/test_api.py ...................................................... [ 33%]
tests/test_models.py ........................................           [ 51%]
tests/test_utils.py ......................................              [ 67%]
tests/test_views.py .................................................   [ 89%]
tests/test_errors.py ..........F..                                      [ 95%]
tests/test_integration.py .....                                         [ 97%]
tests/test_performance.py ....                                          [100%]

=================================== FAILURES ===================================
___________________________ test_token_expiry ____________________________

    def test_token_expiry():
        token = create_token(expires_in=-1)
>       assert token.is_expired()
E       AssertionError: assert False
E        +  where False = is_expired()

tests/test_errors.py:15: AssertionError
=========================== short test summary info ============================
FAILED tests/test_errors.py::test_token_expiry - AssertionError: assert False
1 failed, 246 passed in 4.21s
```
_~35 lines, ~1,200 tokens._

**After (gabble pytest):**
```
246/247 passed, 1 FAILED

Failures:
tests/test_errors.py::test_token_expiry - AssertionError: assert False
```
_~4 lines, ~50 tokens. -96% tokens._

## Example 4: Git status

**Before (raw):**
```
$ git status
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   src/auth/login.ts
        new file:   src/auth/logout.ts

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
        modified:   src/utils/format.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        src/experimental/
```
_~18 lines, ~300 tokens._

**After (gabble git status):**
```
staged(2): M src/auth/login.ts, A src/auth/logout.ts
unstaged(1): M src/utils/format.ts
untracked(1)
```
_~3 lines, ~30 tokens. -90% tokens._

## Example 5: Context-aware tool selection

**Before (token-wasteful):**
```
Bash: cat src/components/UserProfile.tsx
→ dumps 342 lines of TSX into context (~4,500 tokens)
```
Followed by:
```
Bash: grep -r "useAuth" src/
→ dumps 89 matches with full context lines (~2,000 tokens)
```

**After (gabble token-aware):**
```
Grep: pattern="useAuth", path="src/components/UserProfile.tsx"
→ 3 matches at lines 12, 47, 89 (~30 tokens)

Read: file_path="src/components/UserProfile.tsx", offset=40, limit=60
→ reads only the relevant 60 lines (~800 tokens)
```
_~6,500 tokens → ~830 tokens. -87% tokens._
