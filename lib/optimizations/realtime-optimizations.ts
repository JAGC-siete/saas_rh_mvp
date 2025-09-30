import { useState, useCallback, useRef, useEffect } from 'react'

// 1. Debounced Updates
export function useDebouncedRealtimeUpdate(
  callback: () => void,
  delay: number = 1000
) {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    const newTimeoutId = setTimeout(callback, delay)
    setTimeoutId(newTimeoutId)
  }, [callback, delay, timeoutId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  return debouncedCallback
}

// 2. Selective Updates
export function useSelectiveRealtimeUpdate<T>(
  data: T[],
  key: keyof T,
  updateCallback: (item: T) => void
) {
  const updateItem = useCallback((updatedItem: T) => {
    const index = data.findIndex(item => item[key] === updatedItem[key])
    if (index !== -1) {
      updateCallback(updatedItem)
    }
  }, [data, key, updateCallback])

  return updateItem
}

// 3. Connection Management with Retry Logic
export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  retryCount: number
  lastError?: string
  lastConnected?: Date
}

export function useRealtimeConnectionManager() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0
  })
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxRetries = 5
  const baseDelay = 1000 // 1 second

  const connect = useCallback(async (connectFn: () => Promise<void>) => {
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    setConnectionState(prev => ({ ...prev, status: 'connecting' }))
    
    try {
      await connectFn()
      setConnectionState({
        status: 'connected',
        retryCount: 0,
        lastConnected: new Date()
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setConnectionState(prev => ({
        status: 'error',
        retryCount: prev.retryCount + 1,
        lastError: errorMessage
      }))
      
      // Retry with exponential backoff
      if (connectionState.retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, connectionState.retryCount)
        console.log(`🔄 Retrying connection in ${delay}ms (attempt ${connectionState.retryCount + 1}/${maxRetries})`)
        
        retryTimeoutRef.current = setTimeout(() => {
          connect(connectFn)
        }, delay)
      } else {
        console.error('❌ Max retries reached, giving up')
      }
    }
  }, [connectionState.retryCount])

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    
    setConnectionState(prev => ({
      ...prev,
      status: 'disconnected'
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    connectionState,
    connect,
    disconnect
  }
}

// 4. Message Batching
export class MessageBatcher<T> {
  private messages: T[] = []
  private batchTimeout: NodeJS.Timeout | null = null
  private batchSize: number
  private batchDelay: number
  private onBatch: (messages: T[]) => void

  constructor(
    onBatch: (messages: T[]) => void,
    batchSize: number = 10,
    batchDelay: number = 1000
  ) {
    this.onBatch = onBatch
    this.batchSize = batchSize
    this.batchDelay = batchDelay
  }

  public addMessage(message: T) {
    this.messages.push(message)

    // Process batch if size limit reached
    if (this.messages.length >= this.batchSize) {
      this.processBatch()
    } else if (!this.batchTimeout) {
      // Set timeout for delayed processing
      this.batchTimeout = setTimeout(() => {
        this.processBatch()
      }, this.batchDelay)
    }
  }

  private processBatch() {
    if (this.messages.length > 0) {
      this.onBatch([...this.messages])
      this.messages = []
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }
  }

  public flush() {
    this.processBatch()
  }

  public destroy() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }
    this.messages = []
  }
}

// 5. Memory-efficient Data Management
export class RealtimeDataManager<T> {
  private data: T[] = []
  private maxSize: number
  private keyExtractor: (item: T) => string | number

  constructor(
    keyExtractor: (item: T) => string | number,
    maxSize: number = 100
  ) {
    this.keyExtractor = keyExtractor
    this.maxSize = maxSize
  }

  public addItem(item: T) {
    const key = this.keyExtractor(item)
    const existingIndex = this.data.findIndex(
      existing => this.keyExtractor(existing) === key
    )

    if (existingIndex !== -1) {
      // Update existing item
      this.data[existingIndex] = item
    } else {
      // Add new item
      this.data.unshift(item)
      
      // Remove oldest items if over limit
      if (this.data.length > this.maxSize) {
        this.data = this.data.slice(0, this.maxSize)
      }
    }
  }

  public removeItem(key: string | number) {
    this.data = this.data.filter(
      item => this.keyExtractor(item) !== key
    )
  }

  public getData(): T[] {
    return [...this.data]
  }

  public getItem(key: string | number): T | undefined {
    return this.data.find(item => this.keyExtractor(item) === key)
  }

  public clear() {
    this.data = []
  }

  public size(): number {
    return this.data.length
  }
}

// 6. Performance Monitoring
export interface RealtimeMetrics {
  connectionLatency: number
  messageThroughput: number
  errorRate: number
  reconnectionCount: number
  activeConnections: number
  averageBatchSize: number
  memoryUsage: number
}

export class RealtimeMetricsCollector {
  private metrics: RealtimeMetrics = {
    connectionLatency: 0,
    messageThroughput: 0,
    errorRate: 0,
    reconnectionCount: 0,
    activeConnections: 0,
    averageBatchSize: 0,
    memoryUsage: 0
  }

  private batchSizes: number[] = []
  private startTime: number = Date.now()

  public recordConnection(latency: number) {
    this.metrics.connectionLatency = latency
  }

  public recordMessage() {
    this.metrics.messageThroughput++
  }

  public recordError() {
    this.metrics.errorRate++
  }

  public recordReconnection() {
    this.metrics.reconnectionCount++
  }

  public recordBatchSize(size: number) {
    this.batchSizes.push(size)
    if (this.batchSizes.length > 100) {
      this.batchSizes = this.batchSizes.slice(-100) // Keep last 100
    }
    this.metrics.averageBatchSize = this.batchSizes.reduce((a, b) => a + b, 0) / this.batchSizes.length
  }

  public setActiveConnections(count: number) {
    this.metrics.activeConnections = count
  }

  public updateMemoryUsage() {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize
    }
  }

  public getMetrics(): RealtimeMetrics {
    this.updateMemoryUsage()
    return { ...this.metrics }
  }

  public getUptime(): number {
    return Date.now() - this.startTime
  }

  public reset() {
    this.metrics = {
      connectionLatency: 0,
      messageThroughput: 0,
      errorRate: 0,
      reconnectionCount: 0,
      activeConnections: 0,
      averageBatchSize: 0,
      memoryUsage: 0
    }
    this.batchSizes = []
    this.startTime = Date.now()
  }
}

// 7. Throttling for High-Frequency Updates
export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now
      callback(...args)
    } else {
      // Schedule the call for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now()
        callback(...args)
      }, delay - (now - lastCallRef.current))
    }
  }, [callback, delay]) as T

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return throttledCallback
}
