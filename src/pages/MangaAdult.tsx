import { AdultLanding } from "../components/collections";
import { HomeDataProvider } from "../context/HomeDataContext";

export default function MangaAdult() {
  return (
    <HomeDataProvider>
      <AdultLanding />
    </HomeDataProvider>
  );
}
