import net from 'net';
import HTTPUtils from './httpUtils';
import FileManager from './files';
import { buffer } from 'stream/consumers';

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
    private httpUtils: HTTPUtils | null;

    constructor(port: number, resourcesPath: string) {
        this.port = port;
        this.resourcesPath = resourcesPath;
        this.fileManager = new FileManager(this.resourcesPath);
        this.httpUtils = null;
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
            // TODO: Manage buffer in case is greater than length
            console.log("New client connected");
            console.log("")
            this.httpUtils = new HTTPUtils(data.toString('utf-8'));
            const response: Buffer = await this.managePetition();
            ;
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

    private async managePetition(): Promise<Buffer> {
        const method = this.httpUtils?.headers["Method"];
        const path = this.httpUtils?.headers["Path"];
        switch (method) {
            case 'GET':
                try {
                    const res = await this.handleGet(path);
                    return res;
                } catch (err) {
                    console.error("Error handling request: ", err);
                    return this.createResponse(500, "text/html", "<h1>500 INTERNAL SERVER ERROR</h1>");
                }
            case 'PUT':
                try {
                    //TODO: Create function to handle PUT method
                }
                catch (err) {
                    console.error("Error handling request: ", err)
                }
            default:
                return this.createResponse(405, "text/html", "<h1>405 METHOD NOT ALLOWED</h1>");
        }

    }

    private async handleGet(path: string): Promise<Buffer> {
        console.log("Client ask for:", path);
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
                break;
            default:
                try {
                    const file = await this.fileManager.getFile(path);
                    const ext = this.httpUtils?.headers["Extension"];
                    if (file) {
                        if (ext == "css" || ext == "html" || ext == "txt") {
                            return this.createResponse(200, `text/${ext}`, file);
                        } else {
                            return this.createResponse(200, `application/{ext}`, file);
                        }
                    } else {
                        console.error("Error file does not exists!");
                    }

                } catch (err) {
                    console.error("Error obtaining file!");
                }
                break;
        }
        return this.createResponse(404, "text/html", "<h1>404 FILE NOT FOUND</h1>");
    }

    private createResponse(code: number, contentType: string, content: Buffer | string): Buffer {
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

    private generateHeader(response: Response): Buffer {
        const codes: { [key: number]: string } = {
            200: 'OK',
            201: 'Created',
            202: 'Accepted',
            404: 'Not Found',
            405: 'Method Not Allowed',
            415: 'Unsupported Media Type',
            500: 'Internal Server Error'
        }
        const headers = (
            `HTTP/${response.version} ${response.code} ${codes[response.code]}\r\n` +
            `Content-Type: ${response.contentType}\r\n` +
            `Content-Length: ${response.contentLength}\r\n` +
            `Connection: ${response.connection}\r\n` +
            (Buffer.isBuffer(response.content)
                ? `Content-Disposition: attachment; filename="${this.httpUtils?.headers["Path"]}"\r\n\r\n`
                : `\r\n`)
        );
        return Buffer.concat([
            Buffer.from(headers, "utf-8"),
            Buffer.isBuffer(response.content) ? response.content : Buffer.from(response.content, "utf-8")
        ]);

    }
}
