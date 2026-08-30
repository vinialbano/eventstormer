import { eventStoreContract } from './contract-test.ts'
import { createMemoryEventStore } from './memory-store.ts'

eventStoreContract('memory', createMemoryEventStore)
