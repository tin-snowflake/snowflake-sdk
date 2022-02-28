// @ts-ignore
import BufferLayout from "buffer-layout";

export const JOB_ACCOUNT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(8, "discriminator"),
  BufferLayout.blob(32, "owner"),
  BufferLayout.blob(8, "triggerType"),
  BufferLayout.blob(64, "nextExecutionTime"),
  BufferLayout.blob(32, "retryWindow"),
]);
