import Server from './server'
const port: number = 8080;
const resourcesPath = "/home/rarksz/Programs/networks2/http/resources";
function main(port: number) {
    const S = new Server(port, resourcesPath);
    S.start();
}

main(port);
