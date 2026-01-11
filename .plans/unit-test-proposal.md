# Unit Test Proposal: Regression Protection for API Variance

Based on recent integration test findings, we identified several areas where the `CloudronClient` was brittle to API response variations. To prevent these regressions and allow faster feedback without hitting a real server, we should add the following unit tests.

## 1. Storage Check Resilience
**Behavior**: `checkStorage` must not throw if the system status response lacks disk information (common in some environments or permission levels).
**Risk**: High. This blocks all app installations if it fails.
**Proposed Test**:
*   **File**: `tests/cloudron-check-storage.test.ts`
*   **Scenario**: Mock `getStatus` to return a `SystemStatus` object *without* the `disk` property.
*   **Assertion**: Verify `checkStorage` returns a valid `StorageInfo` object with `sufficient: true` (fallback mode) instead of throwing.

## 2. Service Listing Compatibility
**Behavior**: `listServices` should handle API responses that return an array of strings (service names) instead of an array of objects.
**Risk**: Medium. API format appears to vary by version.
**Proposed Test**:
*   **File**: `tests/cloudron-list-services.test.ts`
*   **Scenario**: Mock the API response to be `["mysql", "turn"]`.
*   **Assertion**: Verify `listServices` returns `[{ name: "mysql", status: "unknown" }, { name: "turn", status: "unknown" }]`.

## 3. Log Retrieval Robustness
**Behavior**: `getLogs` must handle raw text responses from the API, as logs are not always JSON-formatted.
**Risk**: Medium. Parsing failure causes `getLogs` to throw `Network error`.
**Proposed Test**:
*   **File**: `tests/cloudron-get-logs.test.ts`
*   **Scenario**: Mock the API response to return a plain text body `"2024-01-01 [INFO] Log 1\n2024-01-01 [WARN] Log 2"`.
*   **Assertion**: Verify `getLogs` correctly parses this into `LogEntry` objects and does not throw a JSON syntax error.

## Summary
These 3 tests cover the specific "real world" edge cases encountered during integration testing, moving the verification to the fast unit test suite.
