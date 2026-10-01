import { readBrand } from "@/lib/brand";
import {
  isPromoEnabled,
  listBanners,
  listCategories,
  listContacts,
  listProducts,
  listReviews,
} from "@/lib/menu-data";
import { getStockMap, isInventoryOn } from "@/lib/inventory-data";
import {
  applyBranchToProduct,
  getBranch,
  isMultiBranchOn,
  resolveBranchId,
} from "@/lib/branches-data";
import { PublicMenu } from "@/components/menu/public-menu";

type Props = { searchParams: Promise<{ branch?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const multi = await isMultiBranchOn();
  const branchId = await resolveBranchId(sp.branch || null);
  const branch = multi ? await getBranch(branchId) : null;

  const [brand, categories, productsRaw, contacts, reviews, banners, invOn, promoOn] =
    await Promise.all([
      readBrand(),
      listCategories(),
      listProducts(),
      listContacts(),
      listReviews(),
      listBanners(),
      isInventoryOn(),
      isPromoEnabled(),
    ]);

  const products = await Promise.all(
    productsRaw.map((p) => applyBranchToProduct(branchId, p))
  );
  const stockMap = invOn ? await getStockMap(branchId) : {};

  return (
    <PublicMenu
      brand={brand}
      categories={categories}
      products={products}
      contacts={contacts}
      reviews={reviews}
      banners={promoOn ? banners : []}
      stockMap={stockMap}
      inventoryEnabled={invOn}
      branchId={branchId}
      branchLabel={branch?.name}
    />
  );
}
