import { useState } from 'react';
import { CheckCircle2, XCircle, Info, X, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { validateJsonSchema, ValidationResult } from '@/lib/jsonUtils';

interface SchemaValidatorProps {
  json: string;
  isJsonValid: boolean;
}

export function SchemaValidator({ json, isJsonValid }: SchemaValidatorProps) {
  const [schema, setSchema] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleValidate = () => {
    if (!schema.trim() || !json.trim()) return;
    const validationResult = validateJsonSchema(json, schema);
    setResult(validationResult);
  };

  const exampleSchema = `{
  "type": "object",
  "required": ["name", "age"],
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "number" }
  }
}`;

  return (
    <div className="flex h-full flex-col bg-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <FileJson className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Schema Validator</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3">,
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Enter a JSON Schema to validate your JSON. Supports basic type checking, 
            required properties, and nested validation.
          </p>
        </div>

        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => setSchema(exampleSchema)}
        >
          Load example schema
        </Button>

        <Textarea
          value={schema}
          onChange={(e) => {
            setSchema(e.target.value);
            setResult(null);
          }}
          placeholder="Paste your JSON Schema here..."
          className="min-h-[200px] font-mono text-sm"
        />

        <Button
          onClick={handleValidate}
          disabled={!schema.trim() || !isJsonValid}
          size="sm"
          className="w-full"
        >
          Validate Against Schema
        </Button>

        {result && (
          <div className="flex items-center gap-1.5 p-3 rounded-md bg-muted/50">
            {result.valid ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span className="text-sm text-accent font-medium">Schema valid!</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">Schema invalid</span>
              </>
            )}
          </div>
        )}

        {result && !result.valid && result.error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {result.error.message}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
