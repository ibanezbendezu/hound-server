import { Injectable } from "@nestjs/common";
import { Octokit } from "@octokit/rest";
import { UsersService } from "src/users/users.service";
import { LRUCache } from "lru-cache";

interface FileContent {
    path: string;
    sha: string;
    content: string;
}

/**
 * Servicio que maneja todas las solicitudes relacionadas con los repositorios.
 */
@Injectable()
export class RepositoriesService {
    // Octokit es una biblioteca de cliente GitHub para JavaScript.
    private octokit: Octokit;
    // LRUCache es una biblioteca de almacenamiento en caché de JavaScript.
    private cache: LRUCache<string, string>;

    constructor(
        private user: UsersService) {
        this.cache = new LRUCache<string, string>({
            max: 1000,
            ttl: 1000 * 60 * 60 // 1 hora
        });
    }

    /**
     * Obtiene el contenido de un repositorio por su propietario y nombre.
     * @param owner Propietario del repositorio.
     * @param name Nombre del repositorio.
     * @param username Nombre de usuario del propietario del repositorio.
     * @returns Contenido del repositorio.
     */
    async getRepositoryContent(owner: string, name: string, username: string) {
        const user_token = await this.user.getUserToken(username);
        const token = user_token || process.env.GITHUB_TOKEN;

        this.octokit = new Octokit({ auth: token });

        try {
            const sha = await this.octokit.repos.getBranch({
                owner,
                repo: name,
                branch: "master"
            });

            const { data } = await this.octokit.git.getTree({
                owner,
                repo: name,
                tree_sha: sha.data.commit.sha,
                recursive: "1"
            });

            const files = data.tree.filter(item => item.type === "blob" && item.path.startsWith("src/main/java/"));

            const fileContents = await Promise.all(files.map(async (file) => {
                const content = await this.getFileContent(owner, name, file.sha);
                return { path: file.path, sha: file.sha, content };
            }));

            return {
                sha: data.sha,
                name,
                owner,
                content: fileContents
            };

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * Obtiene el contenido de un repositorio por su propietario y nombre.
     * Filtra el contenido por tipo de archivo.
     * @param owner Propietario del repositorio.
     * @param name Nombre del repositorio.
     * @param username Nombre de usuario del propietario del repositorio.
     * @param page Número de página.
     * @param perPage Cantidad de elementos por página.
     * @returns Contenido del repositorio filtrado por tipo de archivo.
     */
    async getFilteredRepositoryContent(owner: string, name: string, username: string, page: number = 1, perPage: number = 100): Promise<any> {
        const user_token = await this.user.getUserToken(username);
        const token = user_token || process.env.GITHUB_TOKEN;
    
        this.octokit = new Octokit({ auth: token });
    
        try {
        const sha = await this.octokit.repos.getBranch({
            owner,
            repo: name,
            branch: "master"
        });
    
        const { data } = await this.octokit.git.getTree({
            owner,
            repo: name,
            tree_sha: sha.data.commit.sha,
            recursive: "1",
            page,
            per_page: perPage
        });
    
        const files = data.tree.filter(item => item.type === "blob" && item.path.startsWith("src/main/java/"));
    
        if (files.length === 0) {
            throw new Error("No files found in the repository");
        }
    
        const fileContents = await Promise.allSettled(files.map(async (file) => {
            const content = await this.getFileContent(owner, name, file.sha);
            return { path: file.path, sha: file.sha, content };
        }));
    
        const filteredFiles = fileContents
            .filter(result => result.status === 'fulfilled')
            .map(result => {
                const file = (result as PromiseFulfilledResult<any>).value;
                const fileType = this.identifyFileType(file.content);
                return { ...file, fileType };
            })
            .filter(file => file.fileType !== "Unknown");
    
        return {
            sha: data.sha,
            name,
            owner,
            content: filteredFiles
        };
    
        } catch (error) {
           console.error(error);
        throw error;
        }
    }

    /**
     * Obtiene el contenido de un archivo.
     * @param owner Propietario del repositorio.
     * @param repo Nombre del repositorio.
     * @param file_sha SHA del archivo.
     * @returns Contenido del archivo.
     */
    private async getFileContent(owner: string, repo: string, file_sha: string): Promise<string> {
        const cacheKey = `${owner}:${repo}:${file_sha}`;
        let fileContent = this.cache.get(cacheKey);
    
        if (!fileContent) {
        const { data } = await this.octokit.git.getBlob({
            owner,
            repo,
            file_sha
        });
        fileContent = Buffer.from(data.content, "base64").toString("utf-8");
        this.cache.set(cacheKey, fileContent);
        }
    
        return fileContent;
    }

    /**
     * Identifica el tipo de archivo.
     * @param fileContent Contenido del archivo.
     * @returns Tipo de archivo.
     */
    identifyFileType(fileContent: string): string {
        const controllerPattern = /@Controller|\@GetMapping|\@PostMapping|\@DeleteMapping|\@PutMapping/;
        const servicePattern = /@Service|\@Injectable/;
        const repositoryPattern = /@Repository|findById\(|save\(/;
        const entityPattern = /@Entity/;

        if (controllerPattern.test(fileContent)) {
            return "Controller";
        } else if (servicePattern.test(fileContent)) {
            return "Service";
        } else if (repositoryPattern.test(fileContent)) {
            return "Repository";
        } else if (entityPattern.test(fileContent)) {
            return "Entity";
        }

        return "Unknown";
    }
}
