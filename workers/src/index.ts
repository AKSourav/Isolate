import WorkerPool from "./config/workerPool";


// Start worker pool
const pool = new WorkerPool();
pool.start().then(()=>console.log("started")).catch(console.error);

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await pool.shutdown();
  process.exit(0);
});