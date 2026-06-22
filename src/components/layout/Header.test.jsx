import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Header from './Header'
import { AuthProvider } from '../../context/AuthContext'
import { SearchProvider } from '../../context/SearchContext'
import { ConsentProvider } from '../../context/ConsentContext'

function RouteControls() {
  const navigate = useNavigate()

  return (
    <div>
      <button type="button" onClick={() => navigate('/search?q=ai')}>Go Search</button>
      <button type="button" onClick={() => navigate('/category/politics')}>Go Politics</button>
      <button type="button" onClick={() => navigate('/topic/ai')}>Go Topic</button>
    </div>
  )
}

function renderHeader(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ConsentProvider>
        <AuthProvider>
          <SearchProvider>
            <Routes>
              <Route
                path="*"
                element={(
                  <>
                    <Header darkMode toggleTheme={() => {}} setMenuOpen={() => {}} breakingNews={['Breaking item']} />
                    <RouteControls />
                  </>
                )}
              />
            </Routes>
          </SearchProvider>
        </AuthProvider>
      </ConsentProvider>
    </MemoryRouter>
  )
}

describe('Header route traversal regression', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('keeps the unified landing header variant across route changes', async () => {
    const user = userEvent.setup()
    const { container } = renderHeader('/')

    const header = container.querySelector('.header')
    const nav = container.querySelector('.nav')

    expect(header?.classList.contains('header--landing')).toBe(true)
    expect(nav?.classList.contains('nav--landing')).toBe(true)
    expect(screen.getByRole('link', { name: 'News' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Search news' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Go Search' }))
    expect(container.querySelector('.header')?.classList.contains('header--landing')).toBe(true)
    expect(container.querySelector('.nav')?.classList.contains('nav--landing')).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Go Politics' }))
    expect(container.querySelector('.header')?.classList.contains('header--landing')).toBe(true)
    expect(container.querySelector('.nav')?.classList.contains('nav--landing')).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Go Topic' }))
    expect(container.querySelector('.header')?.classList.contains('header--landing')).toBe(true)
    expect(container.querySelector('.nav')?.classList.contains('nav--landing')).toBe(true)
    expect(screen.getByRole('link', { name: 'Politics' })).toBeTruthy()
  })

  it('opens a category flyout on desktop hover intent', async () => {
    const user = userEvent.setup()
    renderHeader('/')

    const politicsLink = screen.getByRole('link', { name: 'Politics' })
    await user.hover(politicsLink)

    expect(await screen.findByRole('link', { name: 'All Politics' })).toBeTruthy()
  })
})