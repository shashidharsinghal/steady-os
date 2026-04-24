export type IngestDocumentTypeOption = {
  value: string;
  label: string;
  description: string;
  sourceType: string | null;
  available: boolean;
};

export const INGEST_DOCUMENT_TYPE_OPTIONS: IngestDocumentTypeOption[] = [
  {
    value: "auto_detect",
    label: "Auto-detect",
    description: "Let Stride classify the file from its filename and content.",
    sourceType: null,
    available: true,
  },
  {
    value: "sales_report",
    label: "Sales report",
    description: "Petpooja sales exports and orders-master style reports.",
    sourceType: "petpooja_orders_master",
    available: true,
  },
  {
    value: "pnl_report",
    label: "P&L",
    description: "Monthly franchise profit and loss PDF.",
    sourceType: "franchise_pnl_pdf",
    available: true,
  },
  {
    value: "swiggy_report",
    label: "Swiggy report",
    description: "Swiggy annexure and payout workbooks.",
    sourceType: "swiggy_annexure",
    available: true,
  },
  {
    value: "zomato_report",
    label: "Zomato report",
    description: "Zomato annexure exports.",
    sourceType: "zomato_annexure",
    available: true,
  },
  {
    value: "utility_gas_bill",
    label: "Gas bill",
    description: "Utility bill ingestion is planned next.",
    sourceType: "utility_bill_gas",
    available: false,
  },
  {
    value: "utility_rent_bill",
    label: "Rent invoice",
    description: "Rent and landlord invoice ingestion is planned next.",
    sourceType: "utility_bill_rent",
    available: false,
  },
  {
    value: "utility_cam_bill",
    label: "CAM / maintenance",
    description: "CAM and mall-maintenance invoice ingestion is planned next.",
    sourceType: "utility_bill_cam",
    available: false,
  },
  {
    value: "pinelabs_report",
    label: "Pine Labs report",
    description: "Pine Labs POS settlement and transaction exports.",
    sourceType: "pine_labs_pos",
    available: true,
  },
];

export const INGEST_SOURCE_PICKER_OPTIONS = [
  { sourceType: "petpooja_orders_master", displayName: "Sales report" },
  { sourceType: "petpooja_day_wise", displayName: "Petpooja Day-Wise Summary" },
  { sourceType: "pine_labs_pos", displayName: "Pine Labs report" },
  { sourceType: "swiggy_annexure", displayName: "Swiggy report" },
  { sourceType: "zomato_annexure", displayName: "Zomato report" },
  { sourceType: "franchise_pnl_pdf", displayName: "P&L" },
  { sourceType: "utility_bill_gas", displayName: "Gas bill (coming soon)" },
  { sourceType: "utility_bill_rent", displayName: "Rent invoice (coming soon)" },
  { sourceType: "utility_bill_cam", displayName: "CAM / maintenance (coming soon)" },
] as const;

export function resolveDocumentTypeSourceType(documentType: string | null): string | null {
  const option = INGEST_DOCUMENT_TYPE_OPTIONS.find((entry) => entry.value === documentType);
  if (!option || !option.available) return null;
  return option.sourceType;
}
