export interface ValidationResult {
  valid: boolean;
  parsed?: unknown;
  error?: {
    message: string;
    line?: number;
    column?: number;
  };
}

export interface JsonStats {
  lines: number;
  size: string;
  keys: number;
  depth: number;
}

export function validateJson(input: string): ValidationResult {
  if (!input.trim()) {
    return { valid: false, error: { message: 'Empty input' } };
  }

  try {
    const parsed = JSON.parse(input);
    return { valid: true, parsed };
  } catch (e) {
    const error = e as SyntaxError;
    const match = error.message.match(/at position (\d+)/);
    let line = 1;
    let column = 1;

    if (match) {
      const position = parseInt(match[1], 10);
      const lines = input.slice(0, position).split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    return {
      valid: false,
      error: {
        message: error.message,
        line,
        column,
      },
    };
  }
}

export function formatJson(input: string, indent: number = 2): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, indent);
}

export function minifyJson(input: string): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed);
}

export function getJsonStats(input: string, parsed?: unknown): JsonStats {
  const lines = input.split('\n').length;
  const bytes = new Blob([input]).size;
  const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

  let keys = 0;
  let depth = 0;

  try {
    const target = typeof parsed !== 'undefined' ? parsed : JSON.parse(input);
    const countKeysAndDepth = (obj: unknown, currentDepth: number): number => {
      if (typeof obj !== 'object' || obj === null) return currentDepth;

      let maxDepth = currentDepth;

      if (Array.isArray(obj)) {
        obj.forEach(item => {
          maxDepth = Math.max(maxDepth, countKeysAndDepth(item, currentDepth + 1));
        });
      } else {
        Object.keys(obj).forEach(key => {
          keys++;
          maxDepth = Math.max(maxDepth, countKeysAndDepth((obj as Record<string, unknown>)[key], currentDepth + 1));
        });
      }

      return maxDepth;
    };

    depth = countKeysAndDepth(target, 0);
  } catch {
    // Invalid JSON, return defaults
  }

  return { lines, size, keys, depth };
}

export function validateJsonSchema(json: string, schema: string): ValidationResult {
  try {
    const jsonObj = JSON.parse(json);
    const schemaObj = JSON.parse(schema);

    const errors: string[] = [];

    const validateType = (value: unknown, expectedType: string, path: string): boolean => {
      if (expectedType === 'array') {
        if (!Array.isArray(value)) {
          errors.push(`${path}: expected array, got ${typeof value}`);
          return false;
        }
      } else if (expectedType === 'object') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`${path}: expected object, got ${Array.isArray(value) ? 'array' : typeof value}`);
          return false;
        }
      } else if (expectedType === 'null') {
        if (value !== null) {
          errors.push(`${path}: expected null, got ${typeof value}`);
          return false;
        }
      } else if (typeof value !== expectedType) {
        errors.push(`${path}: expected ${expectedType}, got ${typeof value}`);
        return false;
      }
      return true;
    };

    const validateAgainstSchema = (value: unknown, schemaNode: Record<string, unknown>, path: string): void => {
      if (schemaNode.type) {
        validateType(value, schemaNode.type as string, path);
      }

      if (schemaNode.properties && typeof value === 'object' && value !== null) {
        const props = schemaNode.properties as Record<string, Record<string, unknown>>;
        Object.keys(props).forEach(key => {
          if (key in (value as Record<string, unknown>)) {
            validateAgainstSchema((value as Record<string, unknown>)[key], props[key], `${path}.${key}`);
          }
        });
      }

      if (schemaNode.required && typeof value === 'object' && value !== null) {
        (schemaNode.required as string[]).forEach(key => {
          if (!(key in (value as Record<string, unknown>))) {
            errors.push(`${path}: missing required property "${key}"`);
          }
        });
      }

      if (schemaNode.items && Array.isArray(value)) {
        value.forEach((item, index) => {
          validateAgainstSchema(item, schemaNode.items as Record<string, unknown>, `${path}[${index}]`);
        });
      }
    };

    validateAgainstSchema(jsonObj, schemaObj, 'root');

    if (errors.length > 0) {
      return { valid: false, error: { message: errors.join('\n') } };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: { message: (e as Error).message } };
  }
}

export function buildTree(obj: unknown, path: string = 'root', maxDepth: number = 100, currentDepth: number = 0): TreeNode[] {
  if (typeof obj !== 'object' || obj === null) {
    return [];
  }

  // Limit depth to prevent stack overflow on very deep objects
  if (currentDepth > maxDepth) {
    return [];
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => ({
      key: `[${index}]`,
      path: `${path}[${index}]`,
      value: item,
      type: getType(item),
      children: buildTree(item, `${path}[${index}]`, maxDepth, currentDepth + 1),
    }));
  }

  return Object.entries(obj).map(([key, value]) => ({
    key,
    path: `${path}.${key}`,
    value,
    type: getType(value),
    children: buildTree(value, `${path}.${key}`, maxDepth, currentDepth + 1),
  }));
}

export interface TreeNode {
  key: string;
  path: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';
  children: TreeNode[];
}

function getType(value: unknown): TreeNode['type'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as TreeNode['type'];
}

export function parsePathToSegments(path: string): string[] {
  if (path === 'root') return [];
  const cleanPath = path.startsWith('root.') ? path.slice(5) : (path === 'root' ? '' : path);
  if (!cleanPath) return [];

  const segments: string[] = [];
  const regex = /([^.\[\]]+)|\[(\d+)\]/g;
  let match;
  while ((match = regex.exec(cleanPath)) !== null) {
    if (match[1] !== undefined) {
      segments.push(match[1]);
    } else if (match[2] !== undefined) {
      segments.push(match[2]);
    }
  }
  return segments;
}

export function findJsonLineNumberFromPath(jsonText: string, path: string): number {
  const segments = parsePathToSegments(path);
  if (segments.length === 0) return 1;

  const lines = jsonText.split('\n');
  let currentLine = 1;
  let segmentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const targetSegment = segments[segmentIndex];
    if (!targetSegment) break;

    if (/^\d+$/.test(targetSegment)) {
      segmentIndex++;
      i--;
      continue;
    }

    const keyPattern = new RegExp(`["']${targetSegment}["']\\s*:`);
    if (keyPattern.test(line)) {
      currentLine = i + 1;
      segmentIndex++;
    }
  }

  return currentLine;
}

export function inferJsonSchema(value: unknown): string {
  const inferNode = (val: unknown): Record<string, unknown> => {
    if (val === null) {
      return { type: 'null' };
    }
    if (Array.isArray(val)) {
      const itemsSchema = val.length > 0 ? inferNode(val[0]) : { type: 'string' };
      return {
        type: 'array',
        items: itemsSchema,
      };
    }
    if (typeof val === 'object') {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      Object.entries(val).forEach(([key, subVal]) => {
        properties[key] = inferNode(subVal);
        required.push(key);
      });
      return {
        type: 'object',
        properties,
        required,
      };
    }
    if (typeof val === 'number') {
      return { type: 'number' };
    }
    if (typeof val === 'boolean') {
      return { type: 'boolean' };
    }
    return { type: 'string' };
  };

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const schemaObj = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Generated Schema',
      ...inferNode(parsed),
    };
    return JSON.stringify(schemaObj, null, 2);
  } catch {
    return JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Empty Schema',
      type: 'object',
    }, null, 2);
  }
}

