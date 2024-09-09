import { Injectable, NotFoundException } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { LRUCache } from "lru-cache";
import { identifyFileType } from '../shared/utils/util';
import { languagePicker } from '../shared/utils/util';

@Injectable()
export class GithubService {
    // Octokit es una biblioteca de cliente GitHub para Node.js
    private octokit: Octokit;
    // LRUCache es una biblioteca de almacenamiento en caché de Node.js
    private cache: LRUCache<string, string>;

    constructor(
        private prisma: PrismaService,
        private user: UsersService) {
        this.cache = new LRUCache<string, string>({
            max: 1000,
            ttl: 1000 * 60 * 60
        });
    }
    
    /**
     * Obtiene el perfil de un usuario de GitHub y sus repositorios.
     * @param owner Nombre del usuario.
     * @param username Nombre de usuario del propietario del repositorio.
     * @param language Lenguaje de programación.
     * @returns Perfil del usuario y sus repositorios.
     */
    async getOwnerData(owner: string, username: string, language: string = "Java"): Promise<any> {
        const user_token = await this.user.getUserToken(username);
        const token = user_token || process.env.GH_TOKEN;
        this.octokit = new Octokit({ auth: token });

        try {
            const userRes = await this.octokit.users.getByUsername({ username: owner });
            const ownerProfile = userRes.data;

            const reposRes = await this.octokit.repos.listForUser({ username: owner });
            const repos = reposRes.data;


            // Filtrar repositorios por lenguaje
            const javaRepos = repos.filter(repo => repo.language === language);

            // Identificar proyectos de Spring Boot
            const springBootProjects = [];
            const identifyPromises = javaRepos.map(async (repo) => {
                const isSpringBoot = await this.identifySpringBootProject(owner, repo.name);
                if (isSpringBoot) {
                    springBootProjects.push(repo);
                }
            });
            await Promise.all(identifyPromises);


            return { ownerProfile, repos: springBootProjects };
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
     * @param prefix Prefijo de los archivos a filtrar.
     * @param extension Extensión de los archivos a filtrar.
     * @returns Contenido del repositorio filtrado por tipo de archivo.
     */
    async getFilteredRepositoryContent(
        owner: string,
        name: string,
        username: string,
        page: number = 1,
        perPage: number = 100,
        prefix: string = "src/main/java/",
        extension?: string
    ): Promise<any> {
        const user_token = await this.user.getUserToken(username);
        const token = user_token || process.env.GH_TOKEN;
    
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
        
            // Filtrar archivos por prefijo y extensión
            const files = data.tree.filter(item => {
                if (item.type !== "blob") return false;
                if (prefix && !item.path.startsWith(prefix)) return false;
                if (extension && !item.path.endsWith(extension)) return false;
                return true;
            });        
        
        
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
     * Obtiene el contenido de un archivo por su ID.
     * @param id ID del archivo.
     * @param username Nombre de usuario del propietario del archivo.
     * @returns Contenido del archivo.
     */
    async getFileContentById(id: number, username: string) {
        const user_token = await this.user.getUserToken(username);
        const token = user_token || process.env.GH_TOKEN;
        this.octokit = new Octokit({ auth: token });

        const file = await this.prisma.file.findUnique({
            where: { id },
            include: { repository: {
                select: { owner: true, name: true }
            }}
        });

        if (!file) return null;

        const content = await this.getFileContent(file.repository.owner, file.repository.name, file.sha);
        return content;
    }

    /**
     * Obtiene el contenido de un archivo por su SHA.
     * @param sha SHA del archivo.
     * @param username Nombre de usuario del propietario del archivo.
     * @returns Contenido del archivo.
     */
    async getFileContentBySha(sha: string, username: string) {
        try {
            const user_token = await this.user.getUserToken(username);
            const token = user_token || process.env.GH_TOKEN;
            this.octokit = new Octokit({ auth: token });

            const file = await this.prisma.file.findUnique({
                where: { sha },
                include: { repository: {
                    select: { owner: true, name: true }
                }}
            });

            if (!file) return null;

            const content = await this.getFileContent(file.repository.owner, file.repository.name, file.sha);
            return content;
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
     * Identifica si un proyecto es de Spring Boot.
     * @param owner Propietario del repositorio.
     * @param name Nombre del repositorio.
     * @param page Número de página.
     * @param perPage Cantidad de elementos por página.
     * @returns Verdadero si el proyecto es de Spring Boot, falso en caso contrario
     */
    private async identifySpringBootProject(
        owner: string,
        name: string,
        page: number = 1,
        perPage: number = 100
    ): Promise<boolean> {
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
    
            const files = data.tree;
    
            const pomFile = files.find((file: any) => file.path.endsWith('pom.xml'));
            const gradleFile = files.find((file: any) => file.path.endsWith('build.gradle'));
    
            const promises = [];
    
            if (pomFile) {
                promises.push(this.getFileContent(owner, name, pomFile.sha).then(pomContent => {
                    if (pomContent && pomContent.includes('<groupId>org.springframework.boot</groupId>')) {
                        return true;
                    }
                    return false;
                }));
            }
    
            if (gradleFile) {
                promises.push(this.getFileContent(owner, name, gradleFile.sha).then(gradleContent => {
                    if (gradleContent && gradleContent.includes('.springframework.boot')) {
                        return true;
                    }
                    return false;
                }));
            }
    
            const results = await Promise.all(promises);
            return results.includes(true);
    
        } catch (error) {
            console.error(error);
            throw error;
        }
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
