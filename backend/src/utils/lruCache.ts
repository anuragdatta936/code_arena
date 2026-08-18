export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, Node<K, V>>;
  private head: Node<K, V> | null;
  private tail: Node<K, V> | null;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error("Cache capacity must be positive");
    }
    this.capacity = capacity;
    this.cache = new Map<K, Node<K, V>>();
    this.head = null;
    this.tail = null;
  }

  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (!node) {
      return undefined;
    }

    // Move the node to the head (most recently used)
    this.moveToHead(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const node = this.cache.get(key);
    if (node) {
      // Key exists, update value and move to head
      node.value = value;
      this.moveToHead(node);
    } else {
      // New key
      if (this.cache.size >= this.capacity) {
        // Remove the least recently used item (tail)
        this.removeTail();
      }
      // Create new node and add to head
      const newNode: Node<K, V> = { key, value, prev: null, next: null };
      this.cache.set(key, newNode);
      this.addToHead(newNode);
    }
  }

  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }
    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  size(): number {
    return this.cache.size;
  }

  // Helper methods for managing the doubly linked list

  private addToHead(node: Node<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head !== null) {
      this.head.prev = node;
    }
    this.head = node;
    if (this.tail === null) {
      this.tail = node;
    }
  }

  private removeNode(node: Node<K, V>): void {
    if (node.prev !== null) {
      node.prev.next = node.next;
    } else {
      // node is head
      this.head = node.next;
    }

    if (node.next !== null) {
      node.next.prev = node.prev;
    } else {
      // node is tail
      this.tail = node.prev;
    }
  }

  private moveToHead(node: Node<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): void {
    if (this.tail !== null) {
      this.removeNode(this.tail);
      this.cache.delete(this.tail.key);
    }
  }
}

interface Node<K, V> {
  key: K;
  value: V;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
}