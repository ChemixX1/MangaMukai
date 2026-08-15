import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FilterStrip from './FilterStrip';

const FilterStripTactical = () => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFilterClick = (category: string) => {
    setActiveFilter(category);
    navigate('/catalog', category === 'Todos' ? undefined : { state: { filterCategory: category } });
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
