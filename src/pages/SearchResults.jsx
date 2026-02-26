import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { searchRSSContent } from '../rssService'
import './SearchResults.css'

function SearchResults() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const searchResults = await searchRSSContent(query)
        setResults(searchResults)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      }
      setLoading(false)
    }

    performSearch()
  }, [query])

  return (
    <div className="search-results-page">
      <div className="search-header">
        <h1>Search Results</h1>
        <p className="search-query">
          {query ? `Showing results for "${query}"` : 'Enter a search term'}
        </p>
      </div>

      {loading ? (
        <div className="loading-container">
          <p className="loading-text">Searching...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="search-results">
          <p className="results-count">{results.length} articles found</p>
          <div className="results-grid">
            {results.map((article, index) => (
              <a
                key={index}
                href={article.link || article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="result-card"
              >
                {article.image && (
                  <div className="result-image">
                    <img src={article.image} alt={article.title} loading="lazy" />
                  </div>
                )}
                <div className="result-content">
                  <h3 className="result-title">{article.title}</h3>
                  <p className="result-description">
                    {article.description?.substring(0, 150)}
                    {article.description?.length > 150 ? '...' : ''}
                  </p>
                  <div className="result-meta">
                    <span className="result-source">{article.source}</span>
                    <span className="result-date">{article.publishedAt || article.date}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-results">
          <h2>No results found</h2>
          <p>Try different keywords or browse our <Link to="/">latest news</Link></p>
        </div>
      )}
    </div>
  )
}

export default SearchResults
