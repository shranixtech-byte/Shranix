import { DynamicFormPage } from '@/components/ui/DynamicFormPage';

import type { FormField } from '../masters/master-data-page';

import { subCategoryFields } from './sub-categories';

import {
  groupFields,
  variantFields,
  pricingFields,
  barcodeFields,
  hsnFields,
  stockFields,
  imageFields,
  settingsFields,
} from './index';

function makeFormPage(
  module: string,
  listPath: string,
  title: string,
  description: string,
  apiPath: string,
  fields: FormField[],
) {
  return function FormPage() {
    return (
      <DynamicFormPage
        title={title}
        description={description}
        apiPath={apiPath}
        formFields={fields}
        module={module}
        listPath={listPath}
      />
    );
  };
}

// ── Inventory create/edit form pages ─────────────────────
// Note: inventory/items/* routes map to the hand-crafted CreateProductPage/EditProductPage

export const CreateItemGroupPage = makeFormPage(
  'Inventory',
  '/inventory/groups',
  'Item Group',
  'Group items for pricing and discount management',
  '/inventory/groups',
  groupFields,
);
export const CreateSubCategoryPage = makeFormPage(
  'Inventory',
  '/inventory/sub-categories',
  'Sub Category',
  'Manage product sub-categories for detailed classification',
  '/inventory/sub-categories',
  subCategoryFields,
);
export const CreateItemVariantPage = makeFormPage(
  'Inventory',
  '/inventory/variants',
  'Item Variant',
  'Manage product variations (size, color, pack size)',
  '/inventory/variants',
  variantFields,
);
export const CreateItemPricingPage = makeFormPage(
  'Inventory',
  '/inventory/pricing',
  'Item Pricing',
  'Tiered pricing by price list, customer group, and quantity',
  '/inventory/pricing',
  pricingFields,
);
export const CreateItemBarcodePage = makeFormPage(
  'Inventory',
  '/inventory/barcodes',
  'Item Barcode',
  'Manage barcodes, QR codes, and scanning identifiers',
  '/inventory/barcodes',
  barcodeFields,
);
export const CreateHsnCodePage = makeFormPage(
  'Inventory',
  '/inventory/hsn-codes',
  'HSN / SAC Code',
  'Harmonized System codes for GST compliance and customs',
  '/inventory/hsn-codes',
  hsnFields,
);
export const CreateStockOpeningPage = makeFormPage(
  'Inventory',
  '/inventory/stock-opening',
  'Stock Opening',
  'Opening stock entries with batch, serial, and expiry details',
  '/inventory/stock-opening',
  stockFields,
);
export const CreateItemImagePage = makeFormPage(
  'Inventory',
  '/inventory/images',
  'Item Image',
  'Manage product images, thumbnails, and gallery',
  '/inventory/images',
  imageFields,
);
export const CreateInventorySettingsPage = makeFormPage(
  'Inventory',
  '/inventory/settings',
  'Inventory Settings',
  'Global inventory configuration: valuation, tracking, warehouse management',
  '/inventory/settings',
  settingsFields,
);
