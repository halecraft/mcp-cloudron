/**
 * MCP response schema validation helpers
 */
/**
 * Assert that MCP tool response has correct structure
 */
export function assertValidMCPResponse(response) {
    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
}
/**
 * Assert that MCP tool response contains content array
 */
export function assertHasContent(response) {
    assertValidMCPResponse(response);
    expect(response.content).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content.length).toBeGreaterThan(0);
}
/**
 * Assert that MCP tool response has text content
 */
export function assertHasTextContent(response) {
    assertHasContent(response);
    const textContent = response.content.find((c) => c.type === 'text');
    expect(textContent).toBeDefined();
    expect(textContent.text).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    return textContent.text;
}
/**
 * Assert that MCP tool response indicates success
 */
export function assertSuccess(response) {
    assertValidMCPResponse(response);
    expect(response.isError).not.toBe(true);
}
/**
 * Assert that MCP tool response indicates error
 */
export function assertError(response, expectedErrorMessage) {
    assertValidMCPResponse(response);
    expect(response.isError).toBe(true);
    if (expectedErrorMessage) {
        const textContent = response.content.find((c) => c.type === 'text');
        expect(textContent).toBeDefined();
        expect(textContent.text).toContain(expectedErrorMessage);
    }
}
/**
 * Assert that text content can be parsed as JSON
 */
export function assertJSONContent(response) {
    const text = assertHasTextContent(response);
    let parsed;
    expect(() => {
        parsed = JSON.parse(text);
    }).not.toThrow();
    return parsed;
}
/**
 * Assert that response contains an array of items
 */
export function assertArrayResponse(response, minLength = 0) {
    const data = assertJSONContent(response);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(minLength);
    return data;
}
/**
 * Assert that response contains an object
 */
export function assertObjectResponse(response) {
    const data = assertJSONContent(response);
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
    expect(Array.isArray(data)).toBe(false);
    return data;
}
/**
 * Assert that object has required properties
 */
export function assertHasProperties(obj, properties) {
    expect(obj).toBeDefined();
    expect(typeof obj).toBe('object');
    properties.forEach(prop => {
        expect(obj).toHaveProperty(prop);
    });
}
/**
 * Assert that array items have required properties
 */
export function assertArrayItemsHaveProperties(items, properties) {
    expect(Array.isArray(items)).toBe(true);
    items.forEach(item => {
        assertHasProperties(item, properties);
    });
}
//# sourceMappingURL=mcp-assert.js.map