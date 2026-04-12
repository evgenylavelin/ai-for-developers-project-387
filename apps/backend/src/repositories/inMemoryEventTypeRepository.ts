import type { StoredEventType } from "../types.js";

export class InMemoryEventTypeRepository {
  private readonly items = new Map<string, StoredEventType>();

  list(): StoredEventType[] {
    return [...this.items.values()].map(cloneEventType);
  }

  listActive(): StoredEventType[] {
    return this.list().filter((eventType) => !eventType.isArchived);
  }

  get(id: string): StoredEventType | null {
    const eventType = this.items.get(id);

    return eventType ? cloneEventType(eventType) : null;
  }

  save(eventType: StoredEventType): StoredEventType {
    const clonedEventType = cloneEventType(eventType);

    this.items.set(clonedEventType.id, clonedEventType);

    return cloneEventType(clonedEventType);
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }
}

function cloneEventType(eventType: StoredEventType): StoredEventType {
  return { ...eventType };
}