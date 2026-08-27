import { CollectionLanding } from "../components/collections";
import { Footer } from "../components/layout";
import { HomeDataProvider } from "../context/HomeDataContext";

export default function MangaAdult() {
  return (
    <HomeDataProvider>
      <CollectionLanding variant="adult" />
      <Footer />
    </HomeDataProvider>
  );
}
