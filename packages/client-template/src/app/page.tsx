import { readBrand } from "@/lib/brand";
import {
  listBanners,
  listCategories,
  listContacts,
  listProducts,
  listReviews,
} from "@/lib/menu-data";
import { getStockMap, isInventoryOn } from "@/lib/inventory-data";
import { PublicMenu } from "@/components/menu/public-menu";

export default async function HomePage() {
  const [brand, categories, products, contacts, reviews, banners, invOn] =
    await Promise.all([
      readBrand(),
      listCategories(),
      listProducts(),
      listContacts(),
      listReviews(),
      listBanners(),
      isInventoryOn(),
    ]);
  const stockMap = invOn ? await getStockMap() : {};

  return (
    <PublicMenu
      brand={brand}
      categories={categories}
      products={products}
      contacts={contacts}
      reviews={reviews}
      banners={banners}
      stockMap={stockMap}
      inventoryEnabled={invOn}
    />
  );
}
