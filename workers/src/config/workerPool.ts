import { Worker } from 'worker_threads';
import path from 'path';
import { cpus } from 'os';

const WORKER_COUNT = 1;
const QUEUE_NAME = process.env.RABBITMQ_QUEUE || 'service';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://anupam:anupam@localhost:5672';

export default class WorkerPool {
  private workers: Worker[] = [];

  async start() {
    for (let i = 0; i < WORKER_COUNT; i++) {
      const worker = new Worker(path.join(path.dirname(__dirname), '/main/worker.js'), {
        workerData: {
          workerId: i,
          queueName: QUEUE_NAME,
          rabbitmqUrl: RABBITMQ_URL
        }
      });

      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
        this.restartWorker(i);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker ${i} exited with code ${code}`);
          this.restartWorker(i);
        }
      });

      this.workers.push(worker);
    }
  }

  private async restartWorker(index: number) {
    const oldWorker = this.workers[index];
    oldWorker.terminate();

    const newWorker = new Worker(path.join(path.dirname(__dirname), '/main/worker.js'), {
      workerData: {
        workerId: index,
        queueName: QUEUE_NAME,
        rabbitmqUrl: RABBITMQ_URL
      }
    });

    this.workers[index] = newWorker;
  }

  async shutdown() {
    await Promise.all(this.workers.map(worker => worker.terminate()));
  }
}