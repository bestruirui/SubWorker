const $ = {
    log(msg) {
        console.log(`[${this.name}] LOG: ${msg}`);
    },
    info(msg) {
        console.log(`[${this.name}] INFO: ${msg}`);
    },
    error(msg) {
        console.log(`[${this.name}] ERROR: ${msg}`);
    },
    wait(millisec) {
        return new Promise((resolve) => setTimeout(resolve, millisec));
    }
}
export default $;