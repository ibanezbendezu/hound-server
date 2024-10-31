export interface GraphPairDTO {
    id: number;
    similarity: number;
    totalOverlap: number;
    normalizedImpact: number;
    longestFragment: number;
    filepath: string;
    sha: string;
    repositoryId: number;
    repositoryName: string;
    repositoryOwner: string;
}

export interface GraphFileDTO {
    id: number;
    filepath: string;
    layer: string;
    sha: string;
    lineCount: number;
    layerMatch: number;
    top: {
        similarity: number;
        filepath: string;
        repositoryName: string;
        repositoryOwner: string;
    };
    pairs: GraphPairDTO[];
}

export interface GraphLayerDTO {
    name: string;
    averageMatch: number;
    standardDeviation: number;
    numberOfFiles: number;
    layerLines: number;
    layer: string;
    files: GraphFileDTO[];
}

export interface GraphRepositoryDTO {
    id: number;
    name: string;
    owner: string;
    sha: string;
    repositoryLines: number;
    numberOfFiles: number;
    layers: GraphLayerDTO[];
}

export interface GraphGroupDTO {
    id: number;
    sha: string;
    date: Date;
    numberOfRepos: number;
    numberOfFiles: number;
    groupLines: number;
    repositories: GraphRepositoryDTO[];
}
