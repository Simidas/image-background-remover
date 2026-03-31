import ProductPhotoGuide, {
  metadata as productPhotoMeta,
} from "./product-photo-guide";
import BestFreeTools2026, {
  metadata as bestFreeToolsMeta,
} from "./best-free-tools-2026";

export type BlogPost = {
  slug: string;
  component: React.ComponentType;
  metadata: {
    title: string;
    description: string;
    date: string;
    keywords: string[];
  };
};

const posts: BlogPost[] = [
  {
    slug: "product-photo-guide",
    component: ProductPhotoGuide,
    metadata: productPhotoMeta as { title: string; description: string; date: string; keywords: string[] },
  },
  {
    slug: "best-free-background-remover-tools-2026",
    component: BestFreeTools2026,
    metadata: bestFreeToolsMeta as { title: string; description: string; date: string; keywords: string[] },
  },
];

export default posts;
