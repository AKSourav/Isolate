import amqp from 'amqplib';

interface PublisherConfig {
  url: string;
  queue: string;
}

class RabbitMQPublisher {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly config: PublisherConfig;

  constructor(config: PublisherConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.config.queue, { durable: true });
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publishMessage(message: string | Buffer): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Channel not initialized. Call connect() first.');
    }

    try {
      return this.channel.sendToQueue(
        this.config.queue,
        Buffer.from(message),
        { persistent: true }
      );
    } catch (error) {
      console.error('Failed to publish message:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      console.error('Failed to close connections:', error);
      throw error;
    }
  }
}

// Initialize RabbitMQ publisher
export const publisher = new RabbitMQPublisher({
    url: process.env.RABBITMQ_URL as string || 'amqp://anupam:anupam@localhost:5672',
    queue: process.env.RABBITMQ_QUEUE as string || 'service'
  });
  
// Connect to RabbitMQ on startup
publisher.connect().then(()=>console.log("RabbitMQ Connected")).catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
    await publisher.close();
    process.exit(0);
});

export interface MessagePayload {
    content: string;
}