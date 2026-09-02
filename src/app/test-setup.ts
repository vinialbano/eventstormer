import '@vue-flow/core/dist/style.css'

class ResizeObserverStub {
  observe(): undefined {
    return undefined
  }
  unobserve(): undefined {
    return undefined
  }
  disconnect(): undefined {
    return undefined
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverStub,
})
