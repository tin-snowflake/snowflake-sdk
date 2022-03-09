import { PublicKey } from "@solana/web3.js";

export enum ExecutionErrorType {
    ACCOUNT_NOT_AVAILABLE,
    INSUFFICIENT_FUNDS,
    JOB_NOT_ASSIGNED_TO_OPERATOR,
    OTHER
}

export class ExecutionResult {
    action: string;
    flowPublicKey: PublicKey;
    isError: boolean;
    txSignature: string;
    errorMessage: string;

    constructor(action: string, flowPublicKey: PublicKey) {
        this.action = action;
        this.flowPublicKey = flowPublicKey;
    }

    static successResult(action: string, flowPublicKey: PublicKey, txSignature: string): ExecutionResult {
        let result = new ExecutionResult(action, flowPublicKey);
        result.isError = false;
        result.txSignature = txSignature;
        return result;
    }

    static errorResult(action: string, flowPublicKey: PublicKey, errorMessage: string) {
        let result = new ExecutionResult(action, flowPublicKey);
        result.isError = true;
        result.errorMessage = errorMessage;
        return result;
    }

    getDisplayedMessage() {
        if (this.isError) {
            return "Error: " + this.action
                + "; Flow Pubkey: " + this.flowPublicKey 
                + "; Error message: " + this.errorMessage;
        } else {
            return "Successfully: " + this.action 
                + "; Flow Pubkey: " + this.flowPublicKey 
                + "; Transaction signature: " + this.txSignature;
        }
    }

    getErrorType(): ExecutionErrorType {
        if (this.errorMessage === undefined || this.errorMessage.length == 0) {
            return ExecutionErrorType.OTHER;
        }

        if (this.errorMessage.includes("custom program error: 0x1771")) {
            return ExecutionErrorType.JOB_NOT_ASSIGNED_TO_OPERATOR;
        }

        if (this.errorMessage.includes("custom program error: 0xbc4")) {
            return ExecutionErrorType.ACCOUNT_NOT_AVAILABLE;
        }

        return ExecutionErrorType.OTHER;
    }
}