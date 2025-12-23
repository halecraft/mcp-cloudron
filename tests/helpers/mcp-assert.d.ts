/**
 * MCP response schema validation helpers
 */
/**
 * Assert that MCP tool response has correct structure
 */
export declare function assertValidMCPResponse(response: any): void;
/**
 * Assert that MCP tool response contains content array
 */
export declare function assertHasContent(response: any): void;
/**
 * Assert that MCP tool response has text content
 */
export declare function assertHasTextContent(response: any): any;
/**
 * Assert that MCP tool response indicates success
 */
export declare function assertSuccess(response: any): void;
/**
 * Assert that MCP tool response indicates error
 */
export declare function assertError(response: any, expectedErrorMessage?: string): void;
/**
 * Assert that text content can be parsed as JSON
 */
export declare function assertJSONContent(response: any): undefined;
/**
 * Assert that response contains an array of items
 */
export declare function assertArrayResponse(response: any, minLength?: number): undefined;
/**
 * Assert that response contains an object
 */
export declare function assertObjectResponse(response: any): undefined;
/**
 * Assert that object has required properties
 */
export declare function assertHasProperties(obj: any, properties: string[]): void;
/**
 * Assert that array items have required properties
 */
export declare function assertArrayItemsHaveProperties(items: any[], properties: string[]): void;
//# sourceMappingURL=mcp-assert.d.ts.map