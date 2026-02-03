const $ = {
    log(msg) {
        console.log(`SubConv LOG   : ${msg}`);
    },
    info(msg) {
        console.log(`SubConv INFO  : ${msg}`);
    },
    error(msg) {
        console.log(`SubConv ERROR : ${msg}`);
    },
    wait(millisec) {
        return new Promise((resolve) => setTimeout(resolve, millisec));
    }
}
export default $;