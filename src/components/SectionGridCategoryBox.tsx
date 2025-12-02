import CardCategoryBox1 from '@/components/CardCategoryBox1'
import { TCategory } from '@/data/categories'
import React from 'react'

interface SectionGridCategoryBoxProps {
  categories: TCategory[]
  className?: string
}

const SectionGridCategoryBox: React.FC<SectionGridCategoryBoxProps> = ({ categories, className = '' }) => {
  return (
    <div
      className={`grid ${className} grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-3 xl:grid-cols-4`}
    >
      {categories.map((item, i) => (
        <CardCategoryBox1 key={item.id} category={item} />
      ))}
    </div>
  )
}

export default SectionGridCategoryBox
