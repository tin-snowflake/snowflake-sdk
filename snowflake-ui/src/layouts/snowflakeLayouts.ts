import BufferLayout from "buffer-layout";

export const FLOW_ACCOUNT_LAYOUT = BufferLayout.struct([
    BufferLayout.blob(8, "discriminator"),
    BufferLayout.blob(32, "owner")
]);