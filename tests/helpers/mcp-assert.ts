/**
 * MCP response schema validation helpers
 */

/**
 * MCP content item type
 */
interface MCPContentItem {
  type: string
  text?: string
  [key: string]: unknown
}

/**
 * MCP tool response type
 */
interface MCPResponse {
  content?: MCPContentItem[]
  isError?: boolean
  [key: string]: unknown
}

/**
 * Assert that MCP tool response has correct structure
 */
export function assertValidMCPResponse(response: MCPResponse) {
  expect(response).toBeDefined()
  expect(typeof response).toBe("object")
}

/**
 * Assert that MCP tool response contains content array
 */
export function assertHasContent(response: MCPResponse) {
  assertValidMCPResponse(response)
  expect(response.content).toBeDefined()
  expect(Array.isArray(response.content)).toBe(true)
  expect(response.content?.length).toBeGreaterThan(0)
}

/**
 * Assert that MCP tool response has text content
 */
export function assertHasTextContent(response: MCPResponse) {
  assertHasContent(response)
  const textContent = response.content?.find(c => c.type === "text")
  expect(textContent).toBeDefined()
  expect(textContent?.text).toBeDefined()
  expect(typeof textContent?.text).toBe("string")
  return textContent?.text as string
}

/**
 * Assert that MCP tool response indicates success
 */
export function assertSuccess(response: MCPResponse) {
  assertValidMCPResponse(response)
  expect(response.isError).not.toBe(true)
}

/**
 * Assert that MCP tool response indicates error
 */
export function assertError(
  response: MCPResponse,
  expectedErrorMessage?: string,
) {
  assertValidMCPResponse(response)
  expect(response.isError).toBe(true)

  if (expectedErrorMessage) {
    const textContent = response.content?.find(c => c.type === "text")
    expect(textContent).toBeDefined()
    expect(textContent?.text).toContain(expectedErrorMessage)
  }
}

/**
 * Assert that text content can be parsed as JSON
 */
export function assertJSONContent(response: MCPResponse): unknown {
  const text = assertHasTextContent(response)

  let parsed: unknown
  expect(() => {
    parsed = JSON.parse(text)
  }).not.toThrow()

  return parsed
}

/**
 * Assert that response contains an array of items
 */
export function assertArrayResponse(
  response: MCPResponse,
  minLength = 0,
): unknown[] {
  const data = assertJSONContent(response)
  expect(Array.isArray(data)).toBe(true)
  expect((data as unknown[]).length).toBeGreaterThanOrEqual(minLength)
  return data as unknown[]
}

/**
 * Assert that response contains an object
 */
export function assertObjectResponse(
  response: MCPResponse,
): Record<string, unknown> {
  const data = assertJSONContent(response)
  expect(typeof data).toBe("object")
  expect(data).not.toBeNull()
  expect(Array.isArray(data)).toBe(false)
  return data as Record<string, unknown>
}

/**
 * Assert that object has required properties
 */
export function assertHasProperties(
  obj: Record<string, unknown>,
  properties: string[],
) {
  expect(obj).toBeDefined()
  expect(typeof obj).toBe("object")

  for (const prop of properties) {
    expect(obj).toHaveProperty(prop)
  }
}

/**
 * Assert that array items have required properties
 */
export function assertArrayItemsHaveProperties(
  items: Record<string, unknown>[],
  properties: string[],
) {
  expect(Array.isArray(items)).toBe(true)

  for (const item of items) {
    assertHasProperties(item, properties)
  }
}
