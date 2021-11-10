// throw this error if you don't want the ui to show the error.
// this might be useful when the program wants to display the error itself rather than relying on global error handler.
export class QuietError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, QuietError.prototype);
  }
}
