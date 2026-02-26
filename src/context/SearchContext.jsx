import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const SearchContext = createContext()

export const useSearch = () => {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider')
  }
  return context
}

export const SearchProvider = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Initialize topic from URL params or localStorage
  const getInitialTopic = () => {
    const params = new URLSearchParams(location.search)
    const urlTopic = params.get('topic')
    if (urlTopic) return urlTopic
    
    const savedTopic = localStorage.getItem('currentTopic')
    return savedTopic || ''
  }

  const [topic, setTopicState] = useState(getInitialTopic)
  const [searchQuery, setSearchQuery] = useState(getInitialTopic)
  const [suggestedTopic, setSuggestedTopic] = useState(null)

  // Update URL when topic changes
  const setTopic = (newTopic) => {
    setTopicState(newTopic)
    setSearchQuery(newTopic)
    setSuggestedTopic(null)
    
    // Save to localStorage for persistence
    if (newTopic) {
      localStorage.setItem('currentTopic', newTopic)
    } else {
      localStorage.removeItem('currentTopic')
    }
    
    // Update URL params without navigation
    if (newTopic && location.pathname === '/') {
      const params = new URLSearchParams(location.search)
      params.set('topic', newTopic)
      navigate({ search: params.toString() }, { replace: true })
    }
  }

  // Clear topic and return to home
  const clearTopic = () => {
    setTopicState('')
    setSearchQuery('')
    localStorage.removeItem('currentTopic')
    navigate('/')
  }

  // Sync with URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const urlTopic = params.get('topic')
    if (urlTopic && urlTopic !== topic) {
      setTopicState(urlTopic)
      setSearchQuery(urlTopic)
    }
  }, [location.search])

  const value = {
    topic,
    setTopic,
    searchQuery,
    setSearchQuery,
    clearTopic,
    hasActiveTopic: !!topic,
    suggestedTopic,
    setSuggestedTopic
  }

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  )
}

export default SearchContext
