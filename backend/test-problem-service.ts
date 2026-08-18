import { prisma } from "./src/config/prisma";
import { getProblemById, getProblemsByIds, clearProblemCache, invalidateProblemCache } from "./src/services/problem.service";

async function testProblemService() {
  try {
    console.log("Testing Problem Service with LRU Cache...");

    // Clear cache before starting
    clearProblemCache();

    // Create a test problem
    const problem = await prisma.problem.create({
      data: {
        title: "Test Problem - Two Sum",
        difficulty: "Easy",
        tags: ["array", "hash-table"],
        timeLimitMs: 1000,
        memoryLimitMb: 64,
      },
    });

    console.log("Created problem:", problem.id);

    // Create test cases for the problem
    const testCase1 = await prisma.testcase.create({
      data: {
        problemId: problem.id,
        input: "[2,7,11,15]\n9",
        expectedOutput: "[0,1]",
        isSample: true,
      },
    });

    const testCase2 = await prisma.testcase.create({
      data: {
        problemId: problem.id,
        input: "[3,2,4]\n6",
        expectedOutput: "[1,2]",
        isSample: true,
      },
    });

    const testCase3 = await prisma.testcase.create({
      data: {
        problemId: problem.id,
        input: "[3,3]\n6",
        expectedOutput: "[0,1]",
        isSample: false,
      },
    });

    console.log("Created test cases:", testCase1.id, testCase2.id, testCase3.id);

    // Test 1: Get problem by ID (should fetch from DB and cache)
    console.log("\n--- Test 1: First call (should fetch from DB) ---");
    const result1 = await getProblemById(problem.id);
    console.log("First call result:", result1 ? `Problem: ${result1.title}` : "null");
    if (!result1) {
      throw new Error("First call returned null");
    }

    // Test 2: Get problem by ID again (should fetch from cache)
    console.log("\n--- Test 2: Second call (should fetch from cache) ---");
    const result2 = await getProblemById(problem.id);
    console.log("Second call result:", result2 ? `Problem: ${result2.title}` : "null");
    if (!result2) {
      throw new Error("Second call returned null");
    }

    // Verify that the results are the same
    if (result1.id !== result2.id) {
      throw new Error("Results from first and second call do not match");
    }

    // Test 3: Get multiple problems by IDs
    console.log("\n--- Test 3: Get multiple problems by IDs ---");
    const results = await getProblemsByIds([problem.id, "non-existent-id"]);
    console.log("Results for multiple IDs:", results.map(r => r ? r.id : null));
    if (!results[0] || results[0].id !== problem.id) {
      throw new Error("First result in multiple IDs call is incorrect");
    }
    if (results[1] !== null) {
      throw new Error("Second result should be null for non-existent ID");
    }

    // Test 4: Invalidate cache and verify it fetches from DB again
    console.log("\n--- Test 4: Invalidate cache and fetch again ---");
    invalidateProblemCache(problem.id);
    const result3 = await getProblemById(problem.id);
    console.log("Result after invalidation:", result3 ? `Problem: ${result3.title}` : "null");
    if (!result3) {
      throw new Error("Result after invalidation is null");
    }

    // Test 5: Clear cache and verify
    console.log("\n--- Test 5: Clear cache and fetch ---");
    clearProblemCache();
    const result4 = await getProblemById(problem.id);
    console.log("Result after cache clear:", result4 ? `Problem: ${result4.title}` : "null");
    if (!result4) {
      throw new Error("Result after cache clear is null");
    }

    // Clean up
    await prisma.testcase.deleteMany({
      where: { problemId: problem.id },
    });

    await prisma.problem.delete({
      where: { id: problem.id },
    });

    console.log("\n✅ Problem Service tests passed!");
  } catch (error) {
    console.error("❌ Error testing problem service:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testProblemService();