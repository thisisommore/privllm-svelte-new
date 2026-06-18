export const logger = {
    log: (...message: unknown[]) => {
        console.log(`[privllm]`, ...message);
    }
}
