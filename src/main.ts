import Server from './server'
let port: number;
port = 8080;

function main(port: number) {
    const S = new Server(port);
    S.start();
}

main(port);
