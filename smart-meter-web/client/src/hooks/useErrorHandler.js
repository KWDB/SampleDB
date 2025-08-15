import { useState, useCallback } from 'react'

// 错误处理钩子
export const useErrorHandler = () => {
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleError = useCallback((error) => {
    console.error('Error caught by useErrorHandler:', error)
    setError(error)
    setIsLoading(false)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const executeWithErrorHandling = useCallback(async (asyncFunction) => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await asyncFunction()
      setIsLoading(false)
      return result
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling
  }
}