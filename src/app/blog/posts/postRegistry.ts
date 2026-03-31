import ProductPhotoGuide, {
  metadata as productPhotoMeta,
} from "./product-photo-guide";
import BestFreeTools2026, {
  metadata as bestFreeToolsMeta,
} from "./best-free-tools-2026";
import RemoveBackgroundImageGuide, {
  metadata as removeBackgroundImageMeta,
} from "./remove-background-image-guide";
import TransparentBackgroundPng, {
  metadata as transparentBackgroundPngMeta,
} from "./transparent-background-png";
import ShopifyBackgroundRemover, {
  metadata as shopifyBackgroundRemoverMeta,
} from "./shopify-background-remover";
import EcommercePhotographyTips, {
  metadata as ecommercePhotographyTipsMeta,
} from "./ecommerce-photography-tips";
import BatchBackgroundRemoval, {
  metadata as batchBackgroundRemovalMeta,
} from "./batch-background-removal";
import HeadshotBackgroundRemoval, {
  metadata as headshotBackgroundRemovalMeta,
} from "./headshot-background-removal";
import TransparentBackgroundGuide, {
  metadata as transparentBackgroundGuideMeta,
} from "./transparent-background-guide";
import BackgroundRemovalServiceVsTool, {
  metadata as backgroundRemovalServiceVsToolMeta,
} from "./background-removal-service-vs-tool";

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
  {
    slug: "remove-background-from-image-guide",
    component: RemoveBackgroundImageGuide,
    metadata: removeBackgroundImageMeta as { title: string; description: string; date: string; keywords: string[] },
  },
  {
    slug: "transparent-background-png",
    component: TransparentBackgroundPng,
    metadata: transparentBackgroundPngMeta as { title: string; description: string; date: string; keywords: string[] },
  },
  {
    slug: "background-remover-for-shopify",
    component: ShopifyBackgroundRemover,
    metadata: shopifyBackgroundRemoverMeta as { title: string; description: string; date: string; keywords: string[] },
  },
  {
    slug: "ecommerce-product-photography-tips",
    component: EcommercePhotographyTips,
    metadata: ecommercePhotographyTipsMeta as { title: string; description: string; date: string; keywords: string[] },
  },
  {
    slug: "batch-remove-background-multiple-images",
    component: BatchBackgroundRemoval,
    metadata: batchBackgroundRemovalMeta as { title: string; description: string; date: string; keywords: string[] },
  },
  {
    slug: "headshot-background-removal-linkedin",
    component: HeadshotBackgroundRemoval,
    metadata: headshotBackgroundRemovalMeta as { title: string; description: string; date: string; keywords: string[] },
  },
  {
    slug: "transparent-background-images-guide",
    component: TransparentBackgroundGuide,
    metadata: transparentBackgroundGuideMeta as { title: string; description: string; date: string; keywords: string[] },
  },
  {
    slug: "background-removal-service-vs-ai-tool",
    component: BackgroundRemovalServiceVsTool,
    metadata: backgroundRemovalServiceVsToolMeta as { title: string; description: string; date: string; keywords: string[] },
  },
];

export default posts;
