import { getResponsiveImageProps } from '../../utils/imageUtils'

function OptimizedImage({
  src,
  alt = '',
  category = 'general',
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 33vw',
  width = 1200,
  quality = 84,
  loading = 'lazy',
  decoding = 'async',
}) {
  const imageProps = getResponsiveImageProps(src, alt, category, {
    width,
    quality,
    sizes,
    loading,
    decoding,
  })

  return <img className={className} {...imageProps} />
}

export default OptimizedImage
