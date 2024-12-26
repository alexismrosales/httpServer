import net from 'net';
import HTTPUtils from './httpUtils';
import FileManager from './files';

export interface Response {
    version: string;
    contentType: string;
    contentLength: number;
    contentDisposition: string;
    connection: string;
    content: string;
}

export default class Server {
    private port: number;
    private resourcesPath: string;
    private fileManager: FileManager;

    constructor(port: number, resourcesPath: string) {
        this.port = port;
        this.resourcesPath = resourcesPath;
        this.fileManager = new FileManager(resourcesPath);
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
    private manageFiles(method: string, path: string): string {
        const notFoundContent: string = "<h1>404 FILE NOT FOUND</h1>";
        const notFound: Response = {
            version: "1.1",
            contentType: "text/html",
            contentLength: notFoundContent.length,
            contentDisposition: "",
            connection: "close",
            content: notFoundContent,
        };;
        switch (method) {
            case 'GET':
                if (path == "/") {
                    const res: Response = {
                        version: "1.1",
                        contentType: "text/html",
                        contentLength: 0,
                        contentDisposition: "",
                        connection: "close",
                        content: "",
                    };
                    return this.generateHeader(res, 200);
                }
                break;
        }
        return this.generateHeader(notFound, 404);
    }

    public generateHeader(response: Response, code: number): string {
        return ""
    }
}
