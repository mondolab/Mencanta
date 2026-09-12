import { Link } from 'react-router-dom'
import type { Category } from '@/types'

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/productos?categoria=${category.slug}`}
      className="group relative flex aspect-[4/5] items-end overflow-hidden rounded-3xl border border-line bg-beige/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      {category.image_url ? (
        <img
          src={category.image_url}
          alt={category.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-display text-5xl text-sand/50">
          {category.name.charAt(0)}
        </div>
      )}
      <div className="relative w-full bg-gradient-to-t from-black/50 to-transparent p-4 pt-10">
        <h3 className="font-display text-lg text-white drop-shadow">{category.name}</h3>
      </div>
    </Link>
  )
}