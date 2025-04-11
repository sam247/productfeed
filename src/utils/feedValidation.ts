import { logWarning } from './logger';
import * as Sentry from '@sentry/nextjs';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  productId?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  productId?: string;
}

interface ProductData {
  id: string;
  title: string;
  description?: string;
  link: string;
  imageLink: string;
  price: string;
  brand: string;
  gtin?: string;
  mpn?: string;
  condition: string;
  availability: string;
  [key: string]: any;
}

// Required fields for Google Merchant Center
const REQUIRED_FIELDS = [
  'id',
  'title',
  'description',
  'link',
  'imageLink',
  'price',
  'brand',
  'condition',
  'availability'
];

// At least one identifier is required (gtin, mpn, or brand + mpn)
const IDENTIFIER_RULES = {
  gtin: { length: [8, 12, 13, 14] },
  mpn: { maxLength: 70 },
  brand: { maxLength: 70 }
};

// Field-specific validation rules
const VALIDATION_RULES = {
  title: { maxLength: 150 },
  description: { maxLength: 5000 },
  link: { pattern: /^https?:\/\/.+/ },
  imageLink: { pattern: /^https?:\/\/.+\.(jpg|jpeg|png|gif)/i },
  price: { pattern: /^\d+\.?\d* [A-Z]{3}$/ },
  condition: { values: ['new', 'refurbished', 'used'] },
  availability: { values: ['in stock', 'out of stock', 'preorder', 'backorder'] }
};

export class FeedValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  validateProduct(product: ProductData): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Check required fields
    this.validateRequiredFields(product);

    // Check identifiers
    this.validateIdentifiers(product);

    // Validate each field according to rules
    this.validateFields(product);

    // Log validation issues
    if (this.errors.length > 0 || this.warnings.length > 0) {
      this.logValidationIssues(product.id);
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  private validateRequiredFields(product: ProductData) {
    REQUIRED_FIELDS.forEach(field => {
      if (!product[field]) {
        this.errors.push({
          field,
          message: `Missing required field: ${field}`,
          productId: product.id
        });
      }
    });
  }

  private validateIdentifiers(product: ProductData) {
    const hasGtin = !!product.gtin;
    const hasMpn = !!product.mpn;
    const hasBrand = !!product.brand;

    if (!hasGtin && !(hasMpn && hasBrand)) {
      this.errors.push({
        field: 'identifiers',
        message: 'Product must have either GTIN or both MPN and Brand',
        productId: product.id
      });
    }

    // Validate GTIN format if provided
    if (hasGtin) {
      const gtinLength = product.gtin.length;
      if (!IDENTIFIER_RULES.gtin.length.includes(gtinLength)) {
        this.errors.push({
          field: 'gtin',
          message: `Invalid GTIN length. Must be one of: ${IDENTIFIER_RULES.gtin.length.join(', ')} digits`,
          productId: product.id
        });
      }
    }
  }

  private validateFields(product: ProductData) {
    Object.entries(VALIDATION_RULES).forEach(([field, rules]) => {
      if (product[field]) {
        // Check max length
        if ('maxLength' in rules && product[field].length > rules.maxLength) {
          this.errors.push({
            field,
            message: `${field} exceeds maximum length of ${rules.maxLength} characters`,
            productId: product.id
          });
        }

        // Check pattern
        if ('pattern' in rules && !rules.pattern.test(product[field])) {
          this.errors.push({
            field,
            message: `Invalid ${field} format`,
            productId: product.id
          });
        }

        // Check allowed values
        if ('values' in rules && !rules.values.includes(product[field])) {
          this.errors.push({
            field,
            message: `Invalid ${field}. Must be one of: ${rules.values.join(', ')}`,
            productId: product.id
          });
        }
      }
    });
  }

  private logValidationIssues(productId: string) {
    if (this.errors.length > 0) {
      logWarning('Product validation failed', {
        productId,
        errors: this.errors
      });

      Sentry.addBreadcrumb({
        category: 'validation',
        message: 'Product validation failed',
        level: 'warning',
        data: {
          productId,
          errors: this.errors
        }
      });
    }

    if (this.warnings.length > 0) {
      logWarning('Product validation warnings', {
        productId,
        warnings: this.warnings
      });
    }
  }
}

// Utility function to validate an entire feed
export async function validateFeed(
  products: ProductData[],
  onProgress?: (progress: number) => void
): Promise<{
  isValid: boolean;
  validProducts: ProductData[];
  invalidProducts: ProductData[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
}> {
  const validator = new FeedValidator();
  const validProducts: ProductData[] = [];
  const invalidProducts: ProductData[] = [];
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  for (let i = 0; i < products.length; i++) {
    const result = validator.validateProduct(products[i]);
    
    if (result.isValid) {
      validProducts.push(products[i]);
    } else {
      invalidProducts.push(products[i]);
    }

    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);

    // Report progress
    if (onProgress) {
      onProgress((i + 1) / products.length * 100);
    }
  }

  // Log overall validation results
  const validationSummary = {
    totalProducts: products.length,
    validProducts: validProducts.length,
    invalidProducts: invalidProducts.length,
    totalErrors: allErrors.length,
    totalWarnings: allWarnings.length
  };

  if (invalidProducts.length > 0) {
    logWarning('Feed validation completed with errors', validationSummary);
    
    Sentry.addBreadcrumb({
      category: 'validation',
      message: 'Feed validation completed with errors',
      level: 'warning',
      data: validationSummary
    });
  }

  return {
    isValid: invalidProducts.length === 0,
    validProducts,
    invalidProducts,
    errors: allErrors,
    warnings: allWarnings
  };
} 