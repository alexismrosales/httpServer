import net from 'net';
import HTTPUtils from './httpUtils';
export default class Server {
    port: number;

    constructor(port: number) {
        this.port = port;
    }
    public start(): void {
        const server: net.Server = net.createServer((socket) => {
            this.handleClient(socket)
        });
        server.on('error', (err) => {
            console.error(`Error of server: ${err}`);
        });
        server.listen(this.port, () => {
            console.log(`Server listening at port: ${this.port}`);
        });
    }

    private handleClient(socket: net.Socket): void {
        socket.on('data', (data) => {
            console.log("New client connected");
            const httpUtils = new HTTPUtils(data.toString('utf-8'));
            console.log("Header: ", httpUtils.header);
            console.log("Content: ", httpUtils.content)
            const body = '<h1>Hello, world!</h1>';
            const contentLength = Buffer.byteLength(body);
            const response = `HTTP/1.1 200 OK\r\n` +
                `Content-Type: text/html\r\n` +
                `Content-Length: ${contentLength}\r\n` +
                `Connection: keep-alive\r\n\r\n` +
                body;

            socket.write(response);
            socket.end(); // TODO: Remove end of socket depending if keep alive or not
        })

        socket.on('end', () => {
            console.log('Client disconnected!');
        })
        socket.on('error', (err) => {
            console.error(`Error on socket: ${err.message}`);
        });
    }
}
