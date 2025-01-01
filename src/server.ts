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
        let buffer = Buffer.alloc(0);
        let contentLength = 0;
        let headerLength = 0;

        socket.on('data', async (data) => {
            buffer = Buffer.concat([buffer, data]);
            while (true) {
                if (contentLength === 0) {
                    const headerEndIndex = buffer.indexOf("\r\n\r\n");
                    if (headerEndIndex !== -1) {
                        const header = buffer.slice(0, headerEndIndex + 4).toString('utf-8');
                        this.httpUtils = new HTTPUtils(header);
                        contentLength = this.httpUtils.contentLength;
                        headerLength = headerEndIndex + 4;
                    } else {
                        break;
                    }
                }

                if (buffer.length >= headerLength + contentLength) {
                    const body = buffer.slice(headerLength, headerLength + contentLength);
                    if (this.httpUtils)
                        this.httpUtils.content = body.toString('utf-8');
                    try {
                        const response = await this.managePetition();
                        socket.write(response);

                        if (this.httpUtils)
                            if (this.httpUtils.headers["Connection"] !== "keep-alive") {
                                socket.end();
                                return;
                            }
                    } catch (err) {
                        console.error("Error handling request:", err);
                        socket.write(this.createResponse(500, "text/html", "<h1>500 INTERNAL SERVER ERROR</h1>"));
                        socket.end();
                        return;
                    }

                    buffer = buffer.slice(headerLength + contentLength);
                    contentLength = 0;
                    headerLength = 0;
                } else {
                    break;
                }
            }
        });

        socket.on('close', () => {
            console.log("Connection close");
        });

        socket.on('end', () => {
            console.log("Client disconnected!");
        });

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
                    return await this.handleGet(path);
                } catch (err) {
                    console.error("Error handling GET request:", err);
                    return this.createResponse(500, "text/html", "<h1>500 INTERNAL SERVER ERROR</h1>");
                }
            case 'PUT':
                try {
                    if (this.httpUtils) {
                        return await this.handlePut(this.httpUtils.content);
                    } else {
                        console.error("Error with PUT handler");
                    }
                }
                catch (err) {
                    console.error("Error handling PUT request: ", err)
                }
            case 'POST':
                try {
                    if (this.httpUtils) {
                        return await this.handlePost(this.httpUtils.content);
                    } else {
                        console.error("Error with handler POST handler");
                    }
                }
                catch (err) {
                    console.error("Error handling POST request: ", err)
                }
            case 'DELETE':
                try {
                    return this.handleDelete(path);
                } catch (err) {

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
                console.log("xd")
                try {
                    const file = await this.fileManager.getFile("index.html");
                    if (file) {
                        return this.createResponse(200, "text/html", file.toString());
                    }

                } catch (err) {
                    console.error("Error obtaining file!");
                }
                break;
            case 'list':
                try {
                    const list = this.fileManager.listFiles()
                    const listResponse = {
                        list: list,
                    };
                    return this.createResponse(200, "application/json", JSON.stringify(listResponse))
                } catch (error) {
                    console.error("Error obtaining list files:", error)
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
                            return this.createResponse(200, `application/${ext == "js" ? "javascript" : ext}`, file);
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

    private async handlePut(data: string) {
        const content = "<h1>201 FILE CREATED</h1>";
        try {
            const jsonFile = JSON.parse(data);
            const fileBuffer = Buffer.from(jsonFile["content"]);
            if (!jsonFile["filename"] || !jsonFile["content"]) {
                throw new Error("Invalid payload format");
            }
            await this.fileManager.writeFile(jsonFile["filename"], fileBuffer);
            return this.createResponse(201, "text/html", content);
        } catch (err) {
            throw new Error(`Error writing file: ${err}`);
        }
    }

    private async handlePost(data: string) {
        const content = "<h1>202 DATA ACCEPTED</h1>"
        console.log(`New data received:\n ${data}`);
        return this.createResponse(202, "text/html", content);
    }

    private async handleDelete(path: string) {
        const content = "<h1>202 FILE DELETED SUCCESSFULLY</h1>";
        console.log("Client ask for:", path);
        switch (path) {
            case '/':
            case 'index.html':
            case 'jsfile.js':
                return this.createResponse(403, "text/html", `<h1>FILE ${path} NOT ALLOWED TO DELETE</h1>`)
            default:
                try {
                    await this.fileManager.deleteFile(path);
                } catch (err) {
                    console.error(`Error deleting file: ${err}`);
                }
                return this.createResponse(202, "text/html", content);
        }
    }

    private createResponse(code: number, contentType: string, content: Buffer | string): Buffer {
        const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8");
        const res: Response = {
            code: code,
            version: "1.1",
            contentType: contentType,
            contentLength: contentBuffer.byteLength,
            contentDisposition: "",
            connection: this.httpUtils?.headers["Connection"],
            content: content,
        };

        return this.generateHeader(res);
    }

    private generateHeader(response: Response): Buffer {
        const codes: { [key: number]: string } = {
            200: 'OK',
            201: 'Created',
            202: 'Accepted',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            415: 'Unsupported Media Type',
            500: 'Internal Server Error'
        }
        let headers = (
            `HTTP/${response.version} ${response.code} ${codes[response.code]}\r\n` +
            `Content-Type: ${response.contentType}\r\n` +
            `Content-Length: ${response.contentLength}\r\n` +
            `Connection: ${response.connection}\r\n`
        );
        if (Buffer.isBuffer(response.content) && response.contentDisposition) {
            headers += `Content-Disposition: attachment; filename="${this.httpUtils?.headers["Path"]}"\r\n`;
        } else {
            headers += `\r\n`;
        }
        console.log("To sent: ")
        console.log(headers);
        return Buffer.concat([
            Buffer.from(headers, "utf-8"),
            Buffer.isBuffer(response.content) ? response.content : Buffer.from(response.content, "utf-8")
        ]);
    }
}
