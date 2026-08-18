import { prisma } from "./src/config/prisma";

async function testProblemAndTestcaseModels() {
  try {
    console.log("Testing Problem and Testcase models...");

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

    // Retrieve the problem with its test cases
    const problemWithTestCases = await prisma.problem.findUnique({
      where: { id: problem.id },
      include: {
        testcases: true,
      },
    });

    console.log("Retrieved problem with test cases:");
    console.log(JSON.stringify(problemWithTestCases, null, 2));

    // Clean up
    await prisma.testcase.deleteMany({
      where: { problemId: problem.id },
    });

    await prisma.problem.delete({
      where: { id: problem.id },
    });

    console.log("Cleaned up test data");
    console.log("✅ Problem and Testcase models work correctly!");

  } catch (error) {
    console.error("❌ Error testing models:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testProblemAndTestcaseModels();