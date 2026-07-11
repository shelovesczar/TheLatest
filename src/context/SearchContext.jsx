import { createContext, useContext, useState } from 'react'
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
  const urlTopic = new URLSearchParams(location.search).get('topic') || ''
  
  // Initialize topic from URL params or localStorage
  const getInitialTopic = () => {
    const params = new URLSearchParams(location.search)
    const urlTopic = params.get('topic')
    if (urlTopic) return urlTopic
    
    const savedTopic = localStorage.getItem('currentTopic')
    return savedTopic || ''
  }

  const [topicState, setTopicState] = useState(getInitialTopic)
  const [searchQueryState, setSearchQuery] = useState(getInitialTopic)
  const [suggestedTopic, setSuggestedTopic] = useState(null)
  const topic = urlTopic || topicState
  const searchQuery = urlTopic || searchQueryState

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

  // Clear topic state, optionally returning to the home page.
  const clearTopic = ({ navigateHome = true } = {}) => {
    setTopicState('')
    setSearchQuery('')
    localStorage.removeItem('currentTopic')

    if (navigateHome) {
      navigate('/')
    }
  }

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
