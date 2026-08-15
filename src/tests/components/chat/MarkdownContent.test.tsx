import { describe, it, expect } from 'vitest'
import { render, screen } from '../../../test-utils/testing-library-utils'
import MarkdownContent from '../../../components/chat/MarkdownContent'

describe('MarkdownContent', () => {
  it('renders plain text without markdown syntax', () => {
    render(<MarkdownContent content="Hello, AI!" />)

    expect(screen.getByText('Hello, AI!')).toBeInTheDocument()
  })

  it('renders bold markdown as a strong element', () => {
    render(<MarkdownContent content="Hello **Amazon** world" />)

    const boldText = screen.getByText('Amazon')
    expect(boldText.tagName).toBe('STRONG')
    expect(screen.queryByText(/\*\*Amazon\*\*/)).not.toBeInTheDocument()
  })

  it('renders numbered and nested lists as list items', () => {
    const markdown = [
      '1. **Amazon**',
      '   - **Tenure:** December 2023',
      '2. **Omnipresent Robot Tech**',
    ].join('\n')

    render(<MarkdownContent content={markdown} />)

    expect(screen.getByText('Amazon').tagName).toBe('STRONG')
    expect(screen.getByText('Omnipresent Robot Tech').tagName).toBe('STRONG')
    expect(screen.getByText('Tenure:').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(2)
  })

  it('renders markdown links with target blank', () => {
    render(<MarkdownContent content="Visit [Example](https://example.com)" />)

    const link = screen.getByRole('link', { name: 'Example' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders inline code with monospace styling', () => {
    render(<MarkdownContent content="Use `npm install` to install" />)

    const code = screen.getByText('npm install')
    expect(code.tagName).toBe('CODE')
    expect(code).toHaveClass('font-mono')
  })
})
