import { AdultLanding } from "../components/collections";
import { Footer } from "../components/layout";
import { HomeDataProvider } from "../context/HomeDataContext";

export default function MangaAdult() {
  return (
    <HomeDataProvider>
      <AdultLanding />
      <Footer />
    </HomeDataProvider>
  );
}
