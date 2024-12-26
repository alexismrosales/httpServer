import net from 'net';
import HTTPUtils from './httpUtils';
import FileManager from './files';

export interface Response {
    code: number;
    version: string;
    contentType: string;
    contentLength: number;
    contentDisposition: string;
    connection: string;
    content: Buffer | String;
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
        socket.on('data', async (data) => {
            console.log("New client connected");
            const httpUtils: HTTPUtils = new HTTPUtils(data.toString('utf-8'));
            const response: string = await this.managePetition(httpUtils.headers["Method"], httpUtils.headers["Path"]);
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

    private async managePetition(method: string, path: string): Promise<string> {
        switch (method) {
            case 'GET':
                try {
                    const res = await this.handleRequest(path);
                    return res;
                } catch (err) {
                    console.error("Error handling request: ", err);
                    return this.createResponse(500, "text/html", "<h1>500 INTERNAL SERVER ERROR</h1>");
                }
        }
        return this.createResponse(405, "text/html", "<h1>405 METHOD NOT ALLOWED</h1>");
    }

    private async handleRequest(path: string): Promise<string> {
        switch (path) {
            case '/':
            case 'index.html':
                try {
                    const file = await this.fileManager.getFile("index.html");
                    if (file) {
                        return this.createResponse(200, "text/html", file.toString());
                    }

                } catch (err) {
                    console.error("Error obtaining file!");
                }
        }
        return this.createResponse(404, "text/html", "<h1>404 FILE NOT FOUND</h1>");
    }

    private createResponse(code: number, contentType: string, content: Buffer | string): string {
        const res: Response = {
            code: code,
            version: "1.1",
            contentType: contentType,
            contentLength: content.length,
            contentDisposition: "",
            connection: "close",
            content: content,
        };
        return this.generateHeader(res);
    }

    private generateHeader(response: Response): string {
        const codes: { [key: number]: string } = {
            200: 'OK',
            201: 'Created',
            202: 'Accepted',
            404: 'Not Found',
            405: 'Method Not Allowed',
            415: 'Unsupported Media Type',
            500: 'Internal Server Error'
        }
        return `HTTP/${response.version} ${response.code} ${codes[response.code]}\r\n`
            +
            `Content-Type: ${response.contentType}\r\n`
            +
            `Content-Length: ${response.contentLength}\r\n`
            +
            `Connection: ${response.connection}\r\n\r\n`
            +
            response.content
    }
}
