/**
 * Test-mode merch orders (impure Wix adapter). Orders land in the `MerchOrders`
 * Wix Data collection — visible in the site's CMS like real order records —
 * but the whole flow is sandboxed: no payment is taken and the print-on-demand
 * submission is stubbed (see ../merch/printfulStub).
 */

import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { createAdminCollection, withCollection } from "./wixData";

const COLLECTION_ID = "MerchOrders";

export interface MerchOrderRecord {
  orderNumber: string;
  product: string;
  productName: string;
  optionsSummary: string;
  printTitle: string;
  printSub: string;
  /** validated fighter sprite path composited on the print, or "" */
  printWarrior: string;
  /** validated avatar photo URL composited on the print, or "" */
  printAvatar: string;
  /** resolved garment + print swatch hexes, so the receipt preview is exact */
  garmentColor: string;
  printColor: string;
  qty: string;
  unitPrice: string;
  total: string;
  buyerName: string;
  buyerEmail: string;
  memberId: string;
  status: string;
  podProvider: string;
  podOrderId: string;
  podStatus: string;
}

const FIELDS: (keyof MerchOrderRecord)[] = [
  "orderNumber",
  "product",
  "productName",
  "optionsSummary",
  "printTitle",
  "printSub",
  "printWarrior",
  "printAvatar",
  "garmentColor",
  "printColor",
  "qty",
  "unitPrice",
  "total",
  "buyerName",
  "buyerEmail",
  "memberId",
  "status",
  "podProvider",
  "podOrderId",
  "podStatus",
];

const ensureCollection = () =>
  createAdminCollection(COLLECTION_ID, "Merch Orders (test mode)", FIELDS);

export async function insertMerchOrder(record: MerchOrderRecord): Promise<void> {
  await withCollection(
    () =>
      auth.elevate(items.insertDataItem)({
        dataCollectionId: COLLECTION_ID,
        dataItem: { data: { ...record } },
      }),
    ensureCollection,
  );
}

export async function getMerchOrder(orderNumber: string): Promise<MerchOrderRecord | null> {
  try {
    const { items: rows } = await auth
      .elevate(items.queryDataItems)({ dataCollectionId: COLLECTION_ID })
      .eq("orderNumber", orderNumber)
      .limit(1)
      .find();
    const data = rows[0]?.data;
    return data ? (data as unknown as MerchOrderRecord) : null;
  } catch {
    return null;
  }
}
