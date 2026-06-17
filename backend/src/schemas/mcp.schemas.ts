import { z } from 'zod';

const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_<>-]+$/);

export const searchProductsArgsSchema = z.object({
  query: z.string().max(200),
  country: z.union([z.literal(''), z.string().length(2).regex(/^[A-Z]{2}$/)]),
});

export const getProductDetailsArgsSchema = z.object({
  product_id: idSchema,
});

export const buyProductsArgsSchema = z.object({
  product_id: idSchema,
  package_id: z.string().min(1).max(256),
  payment_method: z.enum(['balance', 'bitcoin']),
});

const schemaByTool: Record<string, z.ZodType<Record<string, unknown>>> = {
  'search-products': searchProductsArgsSchema,
  'get-product-details': getProductDetailsArgsSchema,
  'buy-products': buyProductsArgsSchema,
};

export function validateMcpToolArguments(
  toolName: string,
  args: Record<string, unknown>,
): { success: true } | { success: false; fieldSummary: string } {
  const schema = schemaByTool[toolName];
  if (!schema) {
    return { success: false, fieldSummary: `unknown tool: ${toolName}` };
  }

  const result = schema.safeParse(args);
  if (result.success) {
    return { success: true };
  }

  const fieldSummary = result.error.issues
    .map((issue) => issue.path.join('.') || 'root')
    .join(', ');

  return { success: false, fieldSummary };
}
