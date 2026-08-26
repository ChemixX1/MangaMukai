import { Hero, HomePageFrame } from '../components/home';
import { HomeDataProvider } from '../context/HomeDataContext';

export default function Home() {
  return (
    <HomeDataProvider>
      <HomePageFrame hero={<Hero />} />
    </HomeDataProvider>
  );
}
