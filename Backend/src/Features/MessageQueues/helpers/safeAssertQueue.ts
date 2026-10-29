import type amqp from "amqplib";

export async function safeAssertConfirmQueue(
  connection: amqp.ChannelModel,
  currentChannel: amqp.ConfirmChannel,
  queueName: string,
  options: amqp.Options.AssertQueue,
): Promise<{ channel: amqp.ConfirmChannel; ok: amqp.Replies.AssertQueue }> {
  try {
    currentChannel.once("error", () => {});
    const ok = await currentChannel.assertQueue(queueName, options);
    return { channel: currentChannel, ok };
  } catch (err: any) {
    const isMismatch =
      err?.code === 406 ||
      String(err?.message || "").includes("inequivalent arg") ||
      String(err?.message || "").includes("PRECONDITION_FAILED");

    if (isMismatch) {
      const repairChannel = await connection.createChannel();
      try {
        await repairChannel.deleteQueue(queueName);
      } catch {}
      await repairChannel.close();

      const newChannel = await connection.createConfirmChannel();
      const ok = await newChannel.assertQueue(queueName, options);
      return { channel: newChannel, ok };
    }
    throw err;
  }
}

export async function safeAssertQueue(
  connection: amqp.ChannelModel,
  currentChannel: amqp.Channel,
  queueName: string,
  options: amqp.Options.AssertQueue,
): Promise<{ channel: amqp.Channel; ok: amqp.Replies.AssertQueue }> {
  try {
    currentChannel.once("error", () => {});
    const ok = await currentChannel.assertQueue(queueName, options);
    return { channel: currentChannel, ok };
  } catch (err: any) {
    const isMismatch =
      err?.code === 406 ||
      String(err?.message || "").includes("inequivalent arg") ||
      String(err?.message || "").includes("PRECONDITION_FAILED");

    if (isMismatch) {
      const repairChannel = await connection.createChannel();
      try {
        await repairChannel.deleteQueue(queueName);
      } catch {}
      await repairChannel.close();

      const newChannel = await connection.createChannel();
      const ok = await newChannel.assertQueue(queueName, options);
      return { channel: newChannel, ok };
    }
    throw err;
  }
}
