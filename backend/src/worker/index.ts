import { workerMain } from "./jobProcessor";

// Start the worker when this file is executed
workerMain().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});