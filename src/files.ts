import { getAllFilesSync } from 'get-all-files';
// listFiles() returns Files[string]
// getFile(nameFile) returns File
// createFile(nameFile, content: bytes) returns Boolean
// updateFile(nameFile) returns Boolean
// deleteFile(nameFile) returns Boolean 
// updateFiles
export default class FileManager {
    private resourcesPath: string;
    private files: string[] = [];
    constructor(resourcesPath: string) {
        this.resourcesPath = resourcesPath;
        this.files = this.getAllFiles();
    }
    public updateFiles(): void {
        this.files = this.getAllFiles();
    }
    public listFiles(): string[] {
        this.updateFiles();
        return this.files;
    }
    public getFile(nameFile: string): Uint8Array | null {
        let fileExist: boolean = false;
        for (const file in this.files) {
            if (file == nameFile) {
                fileExist = true;
                break;
            }
        }
        if (fileExist) {
            // TODO: searchFile from path resourcesPath+/+/nameFile 
            // and return array of data
        }
        return null
    }
    private getAllFiles(): string[] {
        const filesPaths: string[] = getAllFilesSync(this.resourcesPath).toArray();
        let files: string[] = [];
        for (const file of filesPaths) {
            const nameFile = file.substring(file.lastIndexOf("/") + 1)
            files.push(nameFile)
        }
        return files;
    }
}
