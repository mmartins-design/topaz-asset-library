import Gallery from "@/components/Gallery";
import { getLibrary } from "@/lib/data";

export default async function Home() {
  // Cached; re-reads Google Drive every 5 minutes (see REFRESH_SECONDS in lib/data.ts).
  const library = await getLibrary();
  return (
    <>
      <Gallery library={library} />
      <footer className="site-footer">
        ©{new Date(library.updatedAt).getFullYear()} Topaz Labs. All rights reserved.
      </footer>
    </>
  );
}
