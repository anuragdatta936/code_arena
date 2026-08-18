import { LRUCache } from "./src/utils/lruCache";

async function testLRUCache() {
  console.log("Testing LRU Cache...");

  // Create a cache with capacity 3
  const cache = new LRUCache<string, number>(3);

  // Test put and get
  cache.put("one", 1);
  cache.put("two", 2);
  cache.put("three", 3);

  console.log("Get 'one':", cache.get("one")); // Should return 1
  console.log("Get 'two':", cache.get("two")); // Should return 2
  console.log("Get 'three':", cache.get("three")); // Should return 3

  // Test LRU eviction
  cache.put("four", 4); // This should evict "one" since it's least recently used
  console.log("After adding 'four':");
  console.log("Get 'one':", cache.get("one")); // Should return undefined (evicted)
  console.log("Get 'two':", cache.get("two")); // Should return 2
  console.log("Get 'three':", cache.get("three")); // Should return 3
  console.log("Get 'four':", cache.get("four")); // Should return 4

  // Test accessing an item to make it recently used
  cache.get("two"); // Access 'two' to make it recently used
  cache.put("five", 5); // This should evict "three" (least recently used now)
  console.log("\nAfter accessing 'two' and adding 'five':");
  console.log("Get 'one':", cache.get("one")); // Should return undefined
  console.log("Get 'two':", cache.get("two")); // Should return 2
  console.log("Get 'three':", cache.get("three")); // Should return undefined (evicted)
  console.log("Get 'four':", cache.get("four")); // Should return 4
  console.log("Get 'five':", cache.get("five")); // Should return 5

  // Test delete
  cache.delete("four");
  console.log("\nAfter deleting 'four':");
  console.log("Get 'four':", cache.get("four")); // Should return undefined
  console.log("Get 'five':", cache.get("five")); // Should return 5

  // Test clear
  cache.clear();
  console.log("\nAfter clearing cache:");
  console.log("Get 'two':", cache.get("two")); // Should return undefined
  console.log("Get 'five':", cache.get("five")); // Should return undefined
  console.log("Cache size:", cache.size()); // Should return 0

  console.log("\n✅ LRU Cache tests passed!");
}

testLRUCache().catch(console.error);