import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FilterStrip from './FilterStrip';
import { startGlobalLoading } from '../../utils/globalLoading';

const FilterStripTactical = () => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFilterClick = (category: string) => {
    setActiveFilter(category);
    startGlobalLoading();
    navigate('/biblioteca', category === 'Todos' ? undefined : { state: { filterCategory: category } });
  };

  return (
    <FilterStrip
      id="tactical-filters"
      className="!mt-0"
      beamColor="#38BDF8"
      activeCategory={activeFilter}
      onCategoryChange={handleFilterClick}
    />
  );
};

export default FilterStripTactical;
