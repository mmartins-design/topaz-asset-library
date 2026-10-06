import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AssetDetail from "@/components/AssetDetail";
import Header from "@/components/Header";
import { ArrowLeft } from "@/components/icons";
import { getLibrary } from "@/lib/data";
import { displayFile, thumbUrl } from "@/lib/urls";

// Prebuild every asset page; ones added to Drive later render on first visit and are then cached.
export async function generateStaticParams() {
  const { assets } = await getLibrary();
  // Cache Components requires at least one param at build time.
  return assets.length ? assets.map((a) => ({ slug: a.slug })) : [{ slug: "none" }];
}

async function findAsset(slug: string) {
  const library = await getLibrary();
  return { library, asset: library.assets.find((a) => a.slug === slug) };
}

export async function generateMetadata({ params }: PageProps<"/asset/[slug]">): Promise<Metadata> {
  const { asset } = await findAsset((await params).slug);
  if (!asset) return { title: "Asset not found · Topaz Asset Library" };
  const title = `${asset.title} · Topaz Asset Library`;
  const description = `Before & after made with ${asset.models.join(", ")} by Topaz Labs.`;
  const image = thumbUrl(asset.after ?? displayFile(asset), 1200);
  return {
    title,
    description,
    openGraph: { title, description, images: [image], type: "article" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function AssetPage({ params }: PageProps<"/asset/[slug]">) {
  const { library, asset } = await findAsset((await params).slug);
  if (!asset) notFound();

  return (
    <>
      <Header />
      <main className="asset-page">
        <Link href="/" className="back-link">
          <ArrowLeft /> All assets
        </Link>
        <article className="asset-page-panel">
          <AssetDetail asset={asset} source={library.source} headingLevel={1} />
        </article>
      </main>
      <footer className="site-footer">
        ©{new Date(library.updatedAt).getFullYear()} Topaz Labs. All rights reserved.
      </footer>
    </>
  );
}
