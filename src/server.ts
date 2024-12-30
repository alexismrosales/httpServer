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
        let contentLength: number = 0;
        let headerLength: number = 0;
        let buffer = "";
        socket.on('data', async (data) => {
            buffer += data.toString('utf-8');
            if (contentLength === 0) {
                console.log("New client connected");
                this.httpUtils = new HTTPUtils(buffer);
                contentLength = this.httpUtils.contentLength;
                headerLength = this.httpUtils.header.length;
            }

            if (((buffer.length - headerLength) >= contentLength) && contentLength !== 0) {
                try {
                    if (this.httpUtils) {
                        this.httpUtils.content = this.httpUtils.getContent(buffer);
                        const response: Buffer = await this.managePetition();
                        socket.write(response);

                        buffer = "";
                        contentLength = 0;
                        headerLength = 0;

                        // if (this.httpUtils.headers["Connection"] !== "keep-alive") {
                        socket.end();
                        // }
                    }
                } catch (err) {
                    console.error("Error handling request:", err);
                    socket.write(this.createResponse(500, "text/html", "<h1>500 INTERNAL SERVER ERROR</h1>"));
                    socket.end();
                }
            }
            if (contentLength == 0) {
                const response: Buffer = await this.managePetition();
                socket.write(response);
                if (this.httpUtils) {
                    //  if (this.httpUtils.headers["Connection"] != "keep-alive") {
                    socket.end()
                    //  } else {
                    //      console.log("Connection in mode keep-alive");
                    //      resetTimeout();
                    //  }
                }
            }
        });
        let inactivityTimeout: NodeJS.Timeout | null = null;
        const resetTimeout = () => {
            if (inactivityTimeout) {
                clearTimeout(inactivityTimeout);
            }
            inactivityTimeout = setTimeout(() => {
                console.log("Close socket for inactivty");
                socket.end();
            }, 3000);
        };

        socket.on('close', () => {
            if (inactivityTimeout) {
                clearTimeout(inactivityTimeout);
                inactivityTimeout = null;
            }
            console.log("Connection close");
        });

        socket.on('end', () => {
            console.log('Client disconnected!');
        });

        socket.on('error', (err) => {
            console.error(`Error on socket: ${err.message}`);
        });
    }

    private async managePetition(): Promise<Buffer> {
        const method = this.httpUtils?.headers["Method"];
        const path = this.httpUtils?.headers["Path"];
        console.log(`Request:\n${this.httpUtils?.header}`);
        switch (method) {
            case 'GET':
                try {
                    return await this.handleGet(path);
                } catch (err) {
                    console.error("Error handling request:", err);
                    return this.createResponse(500, "text/html", "<h1>500 INTERNAL SERVER ERROR</h1>");
                }
            case 'PUT':
                try {
                    if (this.httpUtils) {
                        return await this.handlePut(this.httpUtils.content);
                    } else {
                        console.error("Error with handler");
                    }
                }
                catch (err) {
                    console.error("Error handling request: ", err)
                }
            case 'DELETE':
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
                            console.log(ext)
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
        console.log(response.content)
        return Buffer.concat([
            Buffer.from(headers, "utf-8"),
            Buffer.isBuffer(response.content) ? response.content : Buffer.from(response.content, "utf-8")
        ]);
    }
}
