let instruction = Buffer.from('afaf6d1f0d989bed', 'hex');
let flow_info = {
  name: 'flow 22',
  trigger: 'trigger 22',
  actions: [
    {
      name: 'basic_action',
      accounts: [
        {
          isSigner: false,
          isWritable: false,
          pubkey: new PublicKey('A81yKd3HLdy4p9go8x8V6UCuWsdZU7i9TErkJ1C2yoGY'),
        },
      ],
      instruction: instruction,
      program: new PublicKey('CkU18ja7QRKhxnQSmcxm7w3fvfEQPmJbM8QfMVncTWT1'),
    },
  ],
};
