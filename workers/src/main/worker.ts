import { workerData } from 'worker_threads';
import amqp from 'amqplib';
import connectDB from './config/db';
import { handleMessage } from './handler';

async function startWorker() {
  const { workerId, queueName, rabbitmqUrl } = workerData;

  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    await channel.prefetch(1);

    console.log(`Worker ${workerId} connected and ready`);

    await channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = msg.content.toString();
          console.log(`Worker ${workerId} processing:`, content);
          
          // processing work
          await handleMessage(content);
          
          channel.ack(msg);
          console.log(`Worker ${workerId} completed processing`);
        } catch (error) {
          console.error(`Worker ${workerId} processing error:`, error);
          channel.ack(msg);
          // channel.nack(msg, false, true);
        }
      }
    });

    process.on('SIGTERM', async () => {
      await channel.close();
      await connection.close();
    });
  } catch (error) {
    console.error(`Worker ${workerId} error:`, error);
    throw error;
  }
}

connectDB(()=>{
  const { workerId, queueName, rabbitmqUrl } = workerData;
  console.log(`Worker ${workerId} connected to db`)
  startWorker().catch((error) => {
    console.error('Worker failed:', error);
    process.exit(1);
  });
})