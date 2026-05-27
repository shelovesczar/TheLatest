import './CardSkeleton.css'

function CardSkeleton({ count = 1 }) {
  return (
    <div className="card-skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="card-skeleton">
          <div className="card-skeleton-media" />
          <div className="card-skeleton-line short" />
          <div className="card-skeleton-line" />
          <div className="card-skeleton-line" />
          <div className="card-skeleton-line long" />
        </article>
      ))}
    </div>
  )
}

export default CardSkeleton
