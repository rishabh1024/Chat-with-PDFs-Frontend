import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateUniqueId, validateMessage, validateFile, formatTimestamp, debounce } from '../../utils'
import { FILE_UPLOAD_CONFIG } from '../../constants'

describe('Utility Functions', () => {
  describe('generateUniqueId', () => {
    it('generates unique IDs', () => {
      const id1 = generateUniqueId()
      const id2 = generateUniqueId()
      
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(typeof id2).toBe('string')
    })

    it('generates IDs with timestamp and random components', () => {
      const id = generateUniqueId()
      
      expect(id).toMatch(/^\d+-[a-z0-9]+$/)
    })

    it('generates multiple unique IDs in quick succession', () => {
      const ids = Array.from({ length: 100 }, () => generateUniqueId())
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(100)
    })
  })

  describe('validateMessage', () => {
    it('validates non-empty messages as valid', () => {
      const result = validateMessage('Hello, world!')
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('rejects empty messages', () => {
      const result = validateMessage('')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Message cannot be empty')
    })

    it('rejects whitespace-only messages', () => {
      const result = validateMessage('   \n\t   ')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Message cannot be empty')
    })

    it('rejects messages longer than 4000 characters', () => {
      const longMessage = 'a'.repeat(4001)
      const result = validateMessage(longMessage)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Message too long (max 4000 characters)')
    })

    it('accepts messages exactly 4000 characters long', () => {
      const maxLengthMessage = 'a'.repeat(4000)
      const result = validateMessage(maxLengthMessage)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('trims whitespace before validation', () => {
      const result = validateMessage('  valid message  ')
      
      expect(result.isValid).toBe(true)
    })

    it('handles special characters correctly', () => {
      const specialMessage = 'Message with émojis 🚀 and ñspecial chars!'
      const result = validateMessage(specialMessage)
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('validateFile', () => {
    it('accepts supported file types under the size limit', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      const result = validateFile(
        file,
        FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES,
        FILE_UPLOAD_CONFIG.MAX_FILE_SIZE
      )

      expect(result.isValid).toBe(true)
    })

    it('rejects unsupported file types', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' })

      const result = validateFile(
        file,
        FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES,
        FILE_UPLOAD_CONFIG.MAX_FILE_SIZE
      )

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unsupported file type')
    })

    it('rejects files over the size limit', () => {
      const largeContent = new Uint8Array(11 * 1024 * 1024)
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' })

      const result = validateFile(
        file,
        FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES,
        FILE_UPLOAD_CONFIG.MAX_FILE_SIZE
      )

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('File too large')
    })
  })

  describe('formatTimestamp', () => {
    it('formats timestamp correctly', () => {
      const date = new Date('2025-05-25T14:30:00')
      const formatted = formatTimestamp(date)
      expect(formatted).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/)
    })
    
    it('formats morning time correctly', () => {
      const morningDate = new Date('2025-05-25T09:15:00')
      const formatted = formatTimestamp(morningDate)
      
      expect(formatted).toBe('09:15 AM')
    })
    
    it('formats afternoon time correctly', () => {
      const afternoonDate = new Date('2025-05-25T15:45:00')
      const formatted = formatTimestamp(afternoonDate)
      
      expect(formatted).toBe('03:45 PM')
    })

    it('formats midnight correctly', () => {
      const midnightDate = new Date('2025-05-25T00:00:00')
      const formatted = formatTimestamp(midnightDate)
      
      expect(formatted).toBe('12:00 AM')
    })

    it('formats noon correctly', () => {
      const noonDate = new Date('2025-05-25T12:00:00')
      const formatted = formatTimestamp(noonDate)
      
      expect(formatted).toBe('12:00 PM')
    })
    
    it('pads minutes with zero when needed', () => {
      const date = new Date('2025-05-25T14:05:00')
      const formatted = formatTimestamp(date)
      
      expect(formatted).toBe('02:05 PM')
    })
  })

  describe('debounce', () => {
    it('delays function execution', async () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)
      
      debouncedFn('test')
      
      expect(mockFn).not.toHaveBeenCalled()
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(mockFn).toHaveBeenCalledWith('test')
    })

    it('cancels previous execution on rapid calls', async () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)
      
      debouncedFn('first')
      debouncedFn('second')
      debouncedFn('third')
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('third')
    })

    it('preserves function context and arguments', async () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 50)
      
      debouncedFn('arg1', 'arg2', 123)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123)
    })

    it('handles multiple independent debounced functions', async () => {
      const mockFn1 = vi.fn()
      const mockFn2 = vi.fn()
      const debouncedFn1 = debounce(mockFn1, 50)
      const debouncedFn2 = debounce(mockFn2, 50)
      
      debouncedFn1('fn1')
      debouncedFn2('fn2')
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockFn1).toHaveBeenCalledWith('fn1')
      expect(mockFn2).toHaveBeenCalledWith('fn2')
    })

    it('works with zero delay', async () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 0)
      
      debouncedFn('immediate')
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockFn).toHaveBeenCalledWith('immediate')
    })
  })
})
