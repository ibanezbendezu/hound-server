import { Octokit } from "@octokit/rest";

export async function getSpringBootRepositories(username: string, owner: string ) {
    const user_token = await this.user.getUserToken(username);
    const token = user_token || process.env.GH_TOKEN;

    this.octokit = new Octokit({ auth: token });

    const { data: repos } = await this.octokit.repos.listForUser( owner );
    
    const springBootRepos = await Promise.all(
        repos.map(async (repo) => {
            try {
                const { data: contents } = await this.octokit.repos.getContent({
                    owner: name,
                    repo: repo.name,
                    path: "pom.xml",
                });
                return repo;
            } catch (error) {
                return null;
            }
        })
    );
    
    return springBootRepos
}