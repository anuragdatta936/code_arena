import { prisma } from './src/config/prisma';

async function main() {
  const problem = await prisma.problem.create({
    data: {
      title: 'Test Problem',
      description: 'This is a test problem.',
      difficulty: 'Easy',
      tags: ['array', 'string'],
      timeLimitMs: 1000,
      memoryLimitMb: 256,
    },
  });

  console.log('Created problem:', problem);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
